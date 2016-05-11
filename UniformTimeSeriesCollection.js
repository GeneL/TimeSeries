/**
 * Created by emliberm on 5/2/2016.
 */

var _ = require('lodash');
//var Q = require('q')
//var safe = require('safe')
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

// var Engine = require('tingodb')();
// var dataBaseDirectory = './db'
// var db = new Engine.Db(dataBaseDirectory, {cacheSize:  1, cacheMaxObjSize: 1});
// var timeSeriesData = db.collection('timeSeries');


var MongoClient = require('mongodb');
//var uri ='mongodb://user:Rockwell1@10.88.46.30:27017/analytics';
var uri = 'mongodb://localhost:27017/analytics';

var secsArray = _.fill(Array(60), null);
var minsArrayWithSecs = _.fill(Array(60), secsArray);

// _.each(_.range(60), function(a){secs[a] = null})
// _.each(_.range(60), function(a) {minsWithSecs[a] = secs})
var timeSeriesData;

util.inherits(TimeSeriesCollection, EventEmitter);
function TimeSeriesCollection(options) {
    if (options) {

        //timeSeriesData = timeSeriesData || db.collection(options.timeSeries);
        //timeSeriesData.createIndex({_id: true})
    }
    Connect(uri);
}

function loadDb() {
    var count = 0
    var dd0 = new Date();
    var counter = 100
    _.forEach(_.range(counter), function (a) {
            var str = "2010-10-10T15:" + _.padStart(_.random(59), 2, '0') + ':' + _.padStart(_.random(59), 2, '0') + ".000Z";
            //console.log(' date: ', dd, ' str: ', str)
            replaceDataValue(new Date(str), _.random(1000), function () {
                count++
                if (count == counter) {
                    var dd1 = new Date();
                    console.log(' It took: ', (dd1.getTime() - dd0.getTime()))
                }
            })
        }
    )
}

function Connect(uri) {
    MongoClient.connect(uri, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            emitter.emit('Connected to database',err)
        } else {
            //HURRAY!! We are connected. :)
            //console.log('Connection established to', uri);
            timeSeriesData = db.collection('timeSeries');
            emitter.emit('Connected to database',uri)
        }
    });
}

function createOneHourChunk(startTime) {
    //console.log(' startTime: ', startTime)
    //var dd = new Date(startTime)
    timeSeriesData.insert({
            _id: startTime.getTime(),
            time_string: startTime,
            created: new Date(),
            //item: {info: 'this is root'},
            type: 'time_series',
            //values: minsWithSecs
            values: minsArrayWithSecs
        }
        , {w: 1, upsert: false}
        , function (err, elem1) {
            //console.log('error: ', err)
            //console.log(" elem1: ", elem1)
            //console.log(' to store or reject time: ', new Date().getTime() - dd.getTime())
        })
}

function createOneHourChunks(startTime, numberOfChunks, callback) {
    //console.log(' startTime: ', startTime)
    //var dd = new Date(startTime)
    var timeIn = startTime
    var timeChunks = _.map(_.range(numberOfChunks), function (a) {
        return new Date(timeIn.getTime() + (a * 3600 * 1000))
    });
    //console.log(' timeChunks: ', timeChunks)
    var count = 0;
    _.forEach(timeChunks, function (a) {
        //var thisDate = new Date(a)
        var msecs = a.getTime()

        timeSeriesData.insert({
                _id: msecs,
                created: new Date(),
                time_string: a,
                //item: {info: 'this is root'},
                type: 'time_series',
                //values: minsWithSecs
                values: minsArrayWithSecs
            }
            , {w: 1, upsert: false}
            , function (err, elem1) {
                count++
                if (count == numberOfChunks) {
                    //emitter.emit('Chunks created')
                    callback(timeChunks)
                }
            })
    })

}

function replaceDataValue(timeIn, value, callback) {
    var dd = new Date();
    //console.log(' timeIn, value ', timeIn, ' ;; ', value)
    var mins = timeIn.getMinutes()
    var secs = timeIn.getSeconds()

    var roundedToHour = timeIn
    roundedToHour.setMinutes(0)
    roundedToHour.setSeconds(0)
    var str = 'values.' + mins + '.' + secs
    //console.log(' str ', str)
    createOneHourChunk(roundedToHour)
    timeSeriesData.update(
        {
            _id: roundedToHour.getTime(),
            type: 'time_series'
        },
        // {$set: {values: {[mins]: {[secs]: value}}}}
        {$set: {[str]: value}}

        , function (err, elem1) {
            // console.log(' $set error: ', err)
            // console.log(" $set elem1: ", elem1.result)
            // //console.log(' $set to store or reject time: ', new Date().getTime() - dd.getTime())
            callback(elem1.result)
        })
}

function updateValuesInOneChunck(timeIn, valuesIn, callback) {
    var cnt = 0
    _.forEach(valuesIn, function (a) {
        var newDate = new Date(timeIn.getTime() + (1000 * cnt++));
        //console.log (' >> ', newDate, ' a: ', a)
        replaceDataValue(newDate, a, function (b) {
            //console.log (' >> ', newDate, ' b: ', b)
            callback(b)
        })
    })
}
function evalProgress(total, current) {
    return ((total-current)/total) * 100
    
}
function storeContiguosDataValues(timeIn, valuesIn, callback) {
    var mins = timeIn.getMinutes()
    var secs = timeIn.getSeconds()
    var roundedToHour = timeIn
    roundedToHour.setMinutes(0)
    roundedToHour.setSeconds(0)

    var secondsLeftInThisHour = (60 * (59 - mins)) + (60 - secs);
    var howManyHours = Math.ceil((valuesIn.length - secondsLeftInThisHour) / 3600)
    
    //console.log('  >>  roundedToHour ', roundedToHour , '  > secondsLeftInThisHour ', secondsLeftInThisHour)
    updateValuesInOneChunck(timeIn, _.slice(valuesIn, 0, secondsLeftInThisHour), function (c) {
        //console.log(' c: ', c)
    })
    var leftValues = _.slice(valuesIn, secondsLeftInThisHour)
    emitter.emit('progress', evalProgress(valuesIn.length,leftValues.length))
    if (valuesIn.length > secondsLeftInThisHour) { //spans over
        var nextHourDate = new Date(roundedToHour.getTime() + (3600 * 1000))
        //console.log('  >>  howManyHours ', howManyHours , '  > nextHourDate ', nextHourDate)
        createOneHourChunks(nextHourDate, howManyHours, function (a) {
            //console.log(' Dates: ', JSON.stringify(a))
            _.each(a, function (b) {
                updateValuesInOneChunck(b, _.slice(valuesIn, 0, leftValues), function (c) {
                    //console.log(' c: ', c)
                })
                leftValues = _.slice(leftValues, 3600)
                emitter.emit('progress', evalProgress(valuesIn.length,leftValues.length))
            })
            callback(a)
        })
    } else { // All are in one chunk
        
    }
}


function count(callback) {
    timeSeriesData.find({}).count().then(function (a) {
        callback(a);
    });
}
emitter.on('count', function(b){
    count(function(a){b(a)})
    //storeContiguosDataValues(timeIn, valuesIn, function(a)
})

emitter.on('store values at time', function(timeIn, valuesIn){
    storeContiguosDataValues(timeIn, valuesIn, function(a){
        emitter.emit('done')
    })
})
// count()
//
// storeContiguosDataValues(new Date('2010-12-10T15:15:00.000Z'), _.range(15000), function (a) {
//     console.log(' done: ', a)
// })

TimeSeriesCollection.prototype.emitter = emitter;
module.exports = TimeSeriesCollection;

//updateValuesInOneChunck(new Date('2010-12-10T15:59:00.000Z'), _.range(150000), function(a) {console.log(' done: ', a)})
//loadDb();

//replaceDataValue(new Date("2010-10-10T15:00:00.000Z"), 900)