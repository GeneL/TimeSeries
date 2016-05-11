/**
 * Created by emliberm on 5/5/2016.
 */
var _ = require('lodash');
var TimeSeries = require('./UniformTimeSeriesCollection')

var timeSeriesPackage = new TimeSeries()
var dd = new Date()
timeSeriesPackage.emitter.on('Connected to database', function(a) {
    console.log (' uri: ', a)
    timeSeriesPackage.emitter.emit('store values at time', new Date('2010-12-10T19:15:00.000Z'), _.range(1500000))
})

timeSeriesPackage.emitter.on('done', function() {
    console.log(' done')
    console.log(' Time :', (new Date().getTime() - dd.getTime()))
    timeSeriesPackage.emitter.emit('count', function(a){
        console.log(' Num of recs :', a)
    })
})
timeSeriesPackage.emitter.on('progress', function(s) {console.log(' progress: ', s, '%')})