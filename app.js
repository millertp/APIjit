var app = require('express')();
var http = require('http');
var request = require('request');

app.set('port', process.env.PORT || 3000);

app.route('/').all(function(req, res) {
  
  // STEP 1
  var CONSUMER_KEY = 'QbcgktohsFb3vepBAyWVwz0cAtmcbm0u';
  var CONSUMER_SECRET = 'zEZZASrwtAPLcPP6';
  var url = 'https://api.telstra.com/v1/oauth/token?client_id=' + CONSUMER_KEY + '&client_secret=' + CONSUMER_SECRET + '&grant_type=client_credentials&scope=SMS';

  request({
      url: url,
      method: 'GET'
    }, function(e, r, body) {
      
      // STEP 2
      var auth_data = JSON.parse(body);

      var url = 'https://api.telstra.com/v1/sms/messages';
      var token = auth_data.access_token;
      var recipient_number = '0413041313';
      var message = 'Hi Tom';

      request({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          url: url,
          json: {
            'to': recipient_number,
            'body': message
          },
          method: 'POST'
        }, function (e, r, body) {
          console.log(body);
          res.send('Done!');
        });
    });
});

app.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});