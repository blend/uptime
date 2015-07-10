var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var CheckEvent = new Schema({
  timestamp   : { type: Date, default: Date.now },
  check       : { type: Schema.ObjectId, ref: 'Check' },
  tags        : [String],
  message     : String,
  isGoDown    : Boolean,
  details     : String,
  // for error events, more details need to be persisted
  downtime    : Number
});

mongoose.model('CheckEvent', CheckEvent);

var MONGO_USER = process.env['MONGO_USER'];
var MONGO_PASSWORD = process.env['MONGO_PASSWORD'];
var MONGO_HOST = process.env['MONGO_HOST'] || "localhost";
var MONGO_DB = process.env['MONGO_DB'] || "blendom";
if (process.env.NODE_ENV === "test") {
  MONGO_DB = "blendom-test";
}
var MONGO_PORT = process.env['MONGO_PORT'] || 27017;

var authRequired = !!config.get('MONGO_USER');
var mongoUri = 'mongodb://';
if (authRequired) {
  mongoUri += process.env.get('MONGO_USER') + ':' + ('MONGO_PWD') + '@';
}
mongoUri += config.get('MONGO_SET');
mongoose.connect('mongodb://' + MONGO_USER + ':' + MONGO_PASSWORD + '@' + MONGO_HOST +'/' + MONGO_DB);
mongoose.connection.on('error', function (err) {
  console.error('MongoDB error: ' + err.message);
  console.error('Make sure a mongoDB server is running and accessible by this application')
});

var Event = mongoose.model('CheckEvent');
Event.find({ message: { $exists: false }}).each(function(err, event) {
  if (err) {
    console.log(err.message);
    return;
  }
  if (!event) process.exit();
  event.message = event.isGoDown ? 'down' : 'up';
  event.save();
});
