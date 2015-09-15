var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var mongoose = require('mongoose');
var request = require('request');
var path = require('path');
var bodyParser = require('body-parser');

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/apijit');

var SMSSchema = mongoose.Schema({
  messageId: { type: String, index: true },
  from: String,
  to: String,
  timestamp: String,
  content: String,
  replies: [{
    timestamp: String,
    content: String
  }]
});

var SMS = mongoose.model('SMS', SMSSchema);

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded( { extended: true } ));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public')));

app.route('/smsreply')
  .post(function(req, res) {

    var messageId = req.body.messageId;
    var timestamp = req.body.acknowledgedTimestamp;
    var content = req.body.content;

    SMS.findOneAndUpdate(
      { 'messageId': messageId },
      { 
        $push: {
          'replies': {
            'timestamp': timestamp,
            'content': content
          }
        }
      },
      { 'new': true },
      function(err, sms) {
        io.emit('new SMS', {
          'messageId': messageId,
          'from': sms.to,
          'to': sms.from,
          'timestamp': timestamp,
          'content': content 
        });
        res.end();
      }
    );
  });

app.route('/')
  
  .get(function(req, res) {
    res.sendfile('views/index.html');    
  })

  .post(function(req, res) {

    var from_name = req.body.from_name;
    var to_number = req.body.to_number;
    var to_content = req.body.to_content;
    
    var CONSUMER_KEY = 'QbcgktohsFb3vepBAyWVwz0cAtmcbm0u';
    var CONSUMER_SECRET = 'zEZZASrwtAPLcPP6';
    var url = 'https://api.telstra.com/v1/oauth/token?client_id=' + CONSUMER_KEY + '&client_secret=' + CONSUMER_SECRET + '&grant_type=client_credentials&scope=SMS';

    request({
        url: url,
        method: 'GET'
      }, function (e, r, body) {
        var token = JSON.parse(body).access_token;
        
        request({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            url: 'https://api.telstra.com/v1/sms/messages',
            json: {
              'to': to_number,
              'body': to_content + ' - ' + from_name + ' via APIjit.xyz'
            },
            method: 'POST'
          }, function (e, r, body) {
            var messageId = body.messageId;
            
            request({
              headers: {
                'Authorization': 'Bearer ' + token
              },
              url: 'https://api.telstra.com/v1/sms/messages/' + messageId,
              method: 'GET'
            }, function (e, r, body) {
              var sentTimestamp = JSON.parse(body).sentTimestamp;

              var sms = new SMS({
                'messageId': messageId,
                'from': from_name,
                'to': to_number,
                'timestamp': sentTimestamp,
                'content': to_content
              });

              sms.save();

              io.emit('existing SMS', sms);

              res.sendfile('views/index.html');
            });
          });
      });
  });

io.on('connection', function(socket) {
  SMS.find({}, function(err, smss) {
    smss.forEach(function(sms) {
      socket.emit('existing SMS', sms);
    });
  });
});

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});