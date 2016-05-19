var test     = require('tape')
  , parallel = require('../parallel.js')
  ;

test('iterates over object', function(t)
{
  var source   = { first: 1, second: 2, third: 3, fourth: 4, three: 3, two: 2, one: 1 }
    , keys     = Object.keys(source)
    , expected = { first: 'A', second: 'B', third: 'C', fourth: 'D', three: 'C', two: 'B', one: 'A' }
    , start    = +new Date()
    ;

  t.plan(keys.length * 2 + 3);

  // supports full value, key, callback (shortcut) interface
  parallel(source, function(item, key, cb)
  {
    t.ok(keys.indexOf(key) != -1, 'expect key (' + key + ') to exist in the keys array');
    t.equal(item, source[key], 'expect item (' + item + ') to match in same key (' + key + ') element in the source object');

    setTimeout(cb.bind(null, null, String.fromCharCode(64 + item)), 200 * item);
  },
  function(err, result)
  {
    var diff = +new Date() - start;

    t.ok(diff < 1000, 'expect response time (' + diff + 'ms) to be less than 1 second');
    t.error(err, 'expect no errors');
    t.deepEqual(result, expected, 'expect result to be an ordered letters object');
  });
});

test('object: longest finishes last', function(t)
{
  var source   = { first: 1, one: 1, four: 4, sixteen: 16, sixtyFour: 64, thirtyTwo: 32, eight: 8, two: 2 }
    , keys     = Object.keys(source)
    , expected = [ 1, 1, 2, 4, 8, 16, 32, 64 ]
    , target   = []
    ;

  t.plan(keys.length + 3);

  // supports just value, callback (shortcut) interface
  parallel(source, function(item, cb)
  {
    setTimeout(function()
    {
      // just "hardcode" first element
      var sum = target.reduce(function(acc, num){ return acc + num; }, 0) || 1;

      t.equal(sum, item, 'expect sum (' + sum + ') to be equal current number (' + item + ')');

      target.push(item);

      cb(null, item);
    }, 25 * item);
  },
  function(err, result)
  {
    t.error(err, 'expect no errors');
    t.deepEqual(result, source, 'expect result to be same as source object');
    t.deepEqual(target, expected, 'expect target to contain ordered numbers');
  });
});

test('object: terminates early', function(t)
{
  var source   = { first: 1, one: 1, four: 4, sixteen: 16, sixtyFour: 64, thirtyTwo: 32, eight: 8, two: 2 }
    , salvaged = { first: 1, one: 1, two: 2, four: 4, eight: 8}
    , expected = [ 1, 1, 2, 4, 8 ]
    , target   = []
    ;

  t.plan(Object.keys(salvaged).length + 4 + 1);

  // supports full value, key, callback (shortcut) interface
  parallel(source, function(item, key, cb)
  {
    var id = setTimeout(function()
    {
      // just "hardcode" first element
      var sum = target.reduce(function(acc, num){ return acc + num; }, 0) || 1;

      t.equal(sum, item, 'expect sum (' + sum + ') to be equal current item (' + key + ':' + item + ')');

      if (item < 10)
      {
        target.push(item);
        cb(null, item);
      }
      // return error on big numbers
      else
      {
        cb({key: key, item: item});
      }
    }, 25 * item);

    return clearTimeout.bind(null, id);
  },
  function(err, result)
  {
    t.equal(err.key, 'sixteen', 'expect to error out on key `sixteen`');
    t.equal(err.item, 16, 'expect to error out on value `16`');
    t.deepEqual(result, salvaged, 'expect result to contain salvaged parts of the source object');
    t.deepEqual(target, expected, 'expect target to contain passed numbers');
  });
});

test('object: handles non terminable iterations', function(t)
{
  var source   = { first: 1, one: 1, four: 4, sixteen: 16, sixtyFour: 64, thirtyTwo: 32, eight: 8, two: 2 }
    , expected = [ 1, 1, 2, 4, 8 ]
    , target   = []
    , previous = 0
    ;

  t.plan(expected.length + 2);

  // supports just value, callback (shortcut) interface
  parallel(source, function(item, cb)
  {
    var id = setTimeout(function()
    {
      if (item < 10)
      {
        // expect it to be invoked in order
        t.ok(item >= previous, 'expect item (' + item + ') to be equal or greater than previous item (' +  previous + ')');
        previous = item;

        target.push(item);
        cb(null, item);
      }
      // return error on big numbers
      else
      {
        cb({item: item});
      }
    }, 25 * item);

    return (item % 2) ? null : clearTimeout.bind(null, id);
  },
  function(err)
  {
    t.equal(err.item, 16, 'expect to error out on 16');
    t.deepEqual(target, expected, 'expect target to contain passed numbers');
  });
});

test('object: handles unclean callbacks', function(t)
{
  var source   = { first: 1, second: 2, third: 3, fourth: 4, three: 3, two: 2, one: 1 }
    , keys     = Object.keys(source)
    , expected = { first: 2, second: 4, third: 6, fourth: 8, three: 6, two: 4, one: 2 }
    ;

  t.plan(keys.length * 2 + 2);

  // supports full value, key, callback (shortcut) interface
  parallel(source, function(item, key, cb)
  {
    setTimeout(function()
    {
      t.ok(keys.indexOf(key) != -1, 'expect key (' + key + ') to exist in the keys array');
      t.equal(item, source[key], 'expect item (' + item + ') to match in same key (' + key + ') element in the source object');

      cb(null, item * 2);
      cb(null, item * -2);

    }, 50 * item);
  },
  function(err, result)
  {
    t.error(err, 'expect no errors');
    t.deepEqual(result, expected, 'expect result to be an ordered letters object');
  });
});