/**
 * Created by emliberm on 3/30/2016.
 */
var util = require('util');
var _ = require('lodash');
//var Q = require('q')
//var Engine = require('tingodb')();

var MongoClient = require('mongodb');
//var uri ='mongodb://user:Rockwell1@10.88.46.30:27017/analytics';
var uri = 'mongodb://localhost:27017/analytics';

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

var itemsDataBase;
var itemsDataBaseName = 'i'
var db;

util.inherits(RandomTimeSeries, EventEmitter);
function RandomTimeSeries(options) {
    MongoClient.connect(uri, function (err, mongodb) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            emitter.emit('Connected to database', err)
        } else {
            db = mongodb;
            if (options) {
                itemsDataBaseName = options.name || itemsDataBaseName;
                itemsDataBase = db.collection(itemsDataBaseName)
                emitter.emit('Connected to database', uri)
            } else {
                itemsDataBase = db.collection(itemsDataBaseName)
                emitter.emit('Connected to database', uri)
            }
        }
    });
}


function clearItems(callback) {
    itemsDataBase.remove({}, callback)
}

/*
 Find item in the database by its id
 */
function findItem(deviceIdIn, callback) {
    itemsDataBase.findOne({thisId: deviceIdIn}
        , {thisId: true, item: true, time: true}, function (err1, itm1) {
            //console.log(' foind: ', itm1)
            if (err1) {
                console.log(' found error: ', err1);
                callback(err1)
            }
            if (itm1) {
                //console.log(' found: ', itm1);
                callback(itm1)
            }
        })
    //return recs
}

/*
 Find item in the database by time range
 */
function findItemsByStartEndTime(start, end, callback) {
    var itemsList = []
    var cr = itemsDataBase.find(
        {time: {$lte: end, $gte: start}}
        , {thisId: true, item: true, time: true}
    ).stream()
    cr.on('data', function (a) {
        itemsList.push(a)
    })
    cr.on('end', function () {
        callback(itemsList)
    })
    //return recs
}
/*
 Store an item in a database. This item can be any object. The callback indicates that the transaction is completed
 */
function storeItemByTime(itemIn, timeIn, deviceId) {
    //console.log('Insering: ', deviceId)
    itemsDataBase.insert(
        {
            thisId: deviceId,
            item: itemIn,
            //active: true,
            time: timeIn,
            lastUpdated: new Date()
        }
        //, {upsert: true}
    )
}


RandomTimeSeries.prototype.storeItemByTime = storeItemByTime;
RandomTimeSeries.prototype.findItemsByStartEndTime = findItemsByStartEndTime;
RandomTimeSeries.prototype.findItem = findItem;
RandomTimeSeries.prototype.clearItems = clearItems;
RandomTimeSeries.prototype.findItem = findItem;
RandomTimeSeries.prototype.emitter = emitter;
module.exports = RandomTimeSeries;

//Test()