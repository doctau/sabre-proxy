'use strict';

let http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy');

let user = process.env.SABRE_USER,
    pcc = process.env.SABRE_PCC,
    password = process.env.SABRE_PASSWORD;

function base64(d) {
  return new Buffer(d).toString('base64');
}

let clientId = "V1:" + user + ":" + pcc + ":AA";
let auth = base64(base64(clientId) + ":" + base64(password))

let oauthOptions = {
  hostname: 'api-crt.cert.havail.sabre.com',
  path: '/v2/auth/token',
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": "Basic " + auth
  },
};

function refresh(cb) {
  console.log('refreshing');
  const req = https.request(oauthOptions, res => {
    console.log("Token refreshed");
    var body = '';
    res.on('data', d => {
      body += d;
    })
    res.on('end', () => {
      const payload = JSON.parse(body);
      if (payload.error != null) {
        console.log(payload)
      } else {
        cb(payload.access_token, payload.expires_in);
      }
    });
  })
  req.write('grant_type=client_credentials');
  req.on('error', e => {
    console.error(e);
  })
  req.end();
}


var token = null;

function start() {
  var proxy = httpProxy.createProxyServer({});
  var server = http.createServer(function(req, res) {
    console.log(token);
    proxy.web(req, res, {
      target: 'https://api-crt.cert.havail.sabre.com',
      secure: true,
      changeOrigin: true,
      headers: {
        'authorization': 'Bearer ' + token
      }
    });
  });

  console.log("listening on port 8080")
  server.listen(8080);
}



function step(tk, expiry) {
  token = tk;
  let refreshTime = expiry / 2;
  console.log('scheduling refresh in ' + refreshTime)
  setTimeout(refresh, refreshTime, step)
}

refresh((tk, expiry) => {
  step(tk, expiry)
  start();
})
