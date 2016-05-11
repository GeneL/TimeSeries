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

//var dataBaseDirectory = './db'

//var db = new Engine.Db(dataBaseDirectory, {});
var itemsDataBase;
var topologyDataBase;
var rootId = 'root1';
var itemsDataBaseName = 'i'
var topologyDataBaseName = 't'
var db;
var rootElement = {}

function createNewRoot(timeIn, callback) {
    rootElement = {
        thisId: rootId,
        timeWritten: new Date(),
        timeCreated: timeIn,
        item: {info: 'this is root'},
        //parantId: 'root',
        children: []
    }
    if (topologyDataBase.isCapped()) {
        topologyDataBase.save(rootElement
            //, {w: 1}
            , function (err, elem1) {
                callback(rootElement)
            })
    } else {
        topologyDataBase.insert(rootElement
            //, {w: 1}
            , function (err, elem1) {
                callback(rootElement)
            })
    }
    itemsDataBase.insert({
            _id: rootId,
            timeWritten: new Date(),
            //item: {info: 'this is root'},
            item: {info: 'this is root'}
        }
        , {w: 1}
        , function (err, elem2) {
        })
}


util.inherits(DeviceNetworkRelationships, EventEmitter);
function DeviceNetworkRelationships(options) {
    MongoClient.connect(uri, function (err, mongodb) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            emitter.emit('Connected to database', err)
        } else {
            db = mongodb;
            if (options) {
                itemsDataBaseName = options.items || itemsDataBaseName;
                topologyDataBaseName = options.topology || topologyDataBaseName

                itemsDataBase = db.collection(itemsDataBaseName)
                topologyDataBase = db.collection(topologyDataBaseName)
                // topologyDataBase = db.createCollection(topologyDataBaseName, {
                //     capped: true,
                //     size: 64 * 64 * 64,
                //     max: 5000
                // })
               // topologyDataBase.isCapped(function(cc) {
               //     console.log(' is capped: ', cc)
               //  })
                //createCollections()
                emitter.emit('Connected to database', uri)
                // if (options.create){
                //     createCollections()
                // }
            } else {
                itemsDataBase = db.collection(itemsDataBaseName)
                topologyDataBase = db.collection(topologyDataBaseName)
                // topologyDataBase = db.createCollection(topologyDataBaseName, {
                //     capped: true,
                //     size: 64 * 64 * 64,
                //     max: 5000
                // })
                emitter.emit('Connected to database', uri)
            }
            //HURRAY!! We are connected. :)
            //console.log('Connection established to', uri);

        }
    });
}


function clearTopology(callback) {
    topologyDataBase.remove({}, callback)
}

function clearItems(callback) {
    itemsDataBase.remove({}, callback)
}

/*
 Find item in the database by its id
 */
function findItem(deviceIdIn, callback) {
    itemsDataBase.findOne({_id: deviceIdIn}
        , {_id: true, item: true, children: true}, function (err1, itm1) {
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
 Store an item in a database. This item can be any object. The callback indicates that the transaction is completed
 */
function storeItem(deviceIn, deviceId) {
    //console.log('Insering: ', deviceIn, ' id: ', deviceId)
    itemsDataBase.insert(
        {
            _id: deviceId,
            item: deviceIn,
            //active: true,
            lastUpdated: new Date()
        }
        , {upsert: true}
    )
}
/*
 Add a child parent relationship to the database. Have to supply child and parent ids.
 If parent id is null the relationship is stored at the top level
 */
function addRelationship(childIdIn, parentIdIn, timeIn) {
    //console.log(' addRelationship: ', childIdIn, ' parent id in: ', parentIdIn, ' time in: ', timeIn)
    var parentId = {}
    if (parentIdIn) { //
        parentId = parentIdIn
    } else { // no parentId so it must be a top element
        parentId = rootElement.thisId
        //console.log( '  this root: ', JSON.stringify(rootElement))
        //parentId = rootId
    }
    var thisRelationship = {
        thisId: childIdIn,
        children: [],
        parentId: parentId,
        timeCreated: timeIn,
        timeWritten: new Date()
    }
    topologyDataBase.insert(thisRelationship)

    topologyDataBase.update({thisId: parentId, timeCreated: timeIn}
        , {$addToSet: {children: childIdIn}}
        //,{w:1 }
        , {upsert: true}
    )
    //callback(itm)

}
/*
 Format relationships as a JSON tree where children property contains an array if child elements
 The information of the element is stored in the item property
 */

function formatRelationship(timeIn, callback) {
    var topologyRes = []
    var itemsList = []

    function getDictionary(topologyRes, callback) {
        var dictionary = {};
        for (var i = 0; i < topologyRes.length; i++) {
            var doc = topologyRes[i];
            dictionary[doc._id] = doc;
            if (i == topologyRes.length - 1) {
                callback(dictionary)
            }
        }
    }

    function buildTree(dictionary, topologyRes) {
        var topologySearchProduct = []
        for (var i = 0; i < topologyRes.length; i++) {
            var doc = topologyRes[i];
            var children = doc.children;
            var ref_children = [];
            for (var j = 0; j < children.length; j++) {
                var child = dictionary[children[j]]; // <-- here's where you need the dictionary
                ref_children.push(child);
            }
            doc.children = ref_children;
            //console.log(' doc: ', doc)
            topologySearchProduct.push(doc)
        }
        callback(_.find(topologySearchProduct, {_id: rootId}).children)
    }

    var itemsCursor = itemsDataBase.find({}, {_id: true, item: true}).stream()
    itemsCursor.on('data', function (a) {
        itemsList.push(a)
    })
    itemsCursor.on('end', function () {
        var topologyCursor = topologyDataBase.find({timeCreated: timeIn}, {
            thisId: true,
            children: true,
            parent: true
        }).stream()
        topologyCursor.on('data', function (topologyElement) {
            var thisElement = _.find(itemsList, {_id: topologyElement.thisId})
            if (thisElement) {
                thisElement.children = topologyElement.children
                topologyRes.push(thisElement)
            }
        })
        topologyCursor.on('end', function () {
            getDictionary(topologyRes, function (dct) {
                buildTree(dct, topologyRes, function (topologySearchProduct) {
                    //console.log(' topologySearchProduct: ', JSON.stringify(topologySearchProduct, null, '\t'))
                })
            })
        })
    })
}
/*
 The test can be executed in a separate file.
 To do this:
 1. create a JavaScript file '<filename.js>'
 2. copy the content of the Test() function in that file
 3. Uncomment these lines:
 //var _ = require('lodash');
 //var DeviceNetworkRelationships = require('./DeviceNetworkRelationships')
 4. in the command line type node <filename.js>

 Make sure node is installed, npm install tingodb
 */
// function Test() {
//
//     //var _ = require('lodash');
//     //var DeviceNetworkRelationships = require('./DeviceNetworkRelationships')
//
//
//     var dn = new DeviceNetworkRelationships({items: 'a', topology: 'b'})
//     dn.emitter.on('Connected to database', function() {
//         var count = 200
//         var start = 1
//         var id_Prefix = 'my arbitrary id'
//         var numOfChildren = 10;
//         //dn.destroyCollections()
//         dn.createCollections()
//         _.map(_.range(start, count), function (a) {
//             var itemToStore = {}
//             itemToStore['Property ' + a] = a
//             itemToStore.time = new Date()
//             itemToStore.extra = {dahgdajkga: 'eeee', yrewlioyrilweo: 'vvvv'}
//             if (a == start) {
//                 dn.storeItem(itemToStore, id_Prefix + a, function (itm) {
//                     dn.addRelationship(id_Prefix + a, null, function (c) {
//                     })
//                 })
//             } else {
//                 if (a % numOfChildren == 0) {
//                     dn.storeItem(itemToStore, id_Prefix + a, function (itm) {
//                         dn.addRelationship(id_Prefix + a, null, function (c) {
//                         })
//                     })
//                 } else {
//                     dn.storeItem(itemToStore, id_Prefix + a, function (itm) {
//                         dn.addRelationship(id_Prefix + a, id_Prefix + (a - 1), function (c) {
//                         })
//                     })
//                 }
//             }
//         })
//
//         dn.formatRelationship(function (s) {
//             console.log(' # of root elements: ', s.length)
//             console.log('The final result.. The tree:\n',JSON.stringify(s))
//             //dn.destroyCollections()
//         })
//     })
//
// }

DeviceNetworkRelationships.prototype.storeItem = storeItem;
DeviceNetworkRelationships.prototype.addRelationship = addRelationship;
//DeviceNetworkRelationships.prototype.deleteOld = deleteOld;
DeviceNetworkRelationships.prototype.clearTopology = clearTopology;
//DeviceNetworkRelationships.prototype.createCollections = createCollections;
//DeviceNetworkRelationships.prototype.destroyCollections = destroyCollections;
DeviceNetworkRelationships.prototype.clearItems = clearItems;
DeviceNetworkRelationships.prototype.formatRelationship = formatRelationship;
DeviceNetworkRelationships.prototype.findItem = findItem;
DeviceNetworkRelationships.prototype.createNewRoot = createNewRoot;
DeviceNetworkRelationships.prototype.emitter = emitter;
//DeviceNetworkRelationships.prototype.Test = Test;
module.exports = DeviceNetworkRelationships;

//Test()