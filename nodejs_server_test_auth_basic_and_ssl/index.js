// Example of the server https is taken from here: https://engineering.circle.com/https-authorized-certs-with-node-js-315e548354a2
// Conversion of client1-crt.pem to certificate.pfx: https://stackoverflow.com/a/38408666/4637638
const express = require('express')
const https = require('https')
const cors = require('cors')
const auth = require('basic-auth')
const app = express()
const appHttps = express()
const appAuthBasic = express()
const fs = require('fs')
const path = require('path')

var options = { 
  key: fs.readFileSync('server-key.pem'), 
  cert: fs.readFileSync('server-crt.pem'), 
  ca: fs.readFileSync('ca-crt.pem'), 
  requestCert: true,
  rejectUnauthorized: false
};

appHttps.get('/', (req, res) => {
  console.log(JSON.stringify(req.headers))
	const cert = req.connection.getPeerCertificate()

// The `req.client.authorized` flag will be true if the certificate is valid and was issued by a CA we white-listed
// earlier in `opts.ca`. We display the name of our user (CN = Common Name) and the name of the issuer, which is
// `localhost`.

	if (req.client.authorized) {
		res.send(`
            <html>
                <head>
                    <script src="/fakeResource" type="text/javascript"></script>
                </head>
                <body>
                    <p>Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!</p>
                </body>
            </html>
        `)
// They can still provide a certificate which is not accepted by us. Unfortunately, the `cert` object will be an empty
// object instead of `null` if there is no certificate at all, so we have to check for a known field rather than
// truthiness.

	} else if (cert.subject) {
		res.status(403).send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`)
// And last, they can come to us with no certificate at all:
	} else {
		res.status(401).send(`Sorry, but you need to provide a client certificate to continue.`)
	}
	res.end()
})

appHttps.get('/fakeResource', (req, res) => {
  console.log(JSON.stringify(req.headers))
  res.set("Content-Type", "text/javascript")
	res.send(`alert("HI");`)
	res.end()
})

// Let's create our HTTPS server and we're ready to go.
https.createServer(options, appHttps).listen(4433)

// Ensure this is before any other middleware or routes
appAuthBasic.use((req, res, next) => {
  let user = auth(req)

  if (user === undefined || user['name'] !== 'USERNAME' || user['pass'] !== 'PASSWORD') {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Node"')
    res.send(`
        <html>
          <head>
          </head>
          <body>
            <h1>Unauthorized</h1>
          </body>
        </html>
      `);
    res.end()
  } else {
    next()
  }
})

appAuthBasic.get("/", (req, res) => {
  console.log(JSON.stringify(req.headers))
  res.send(`
    <html>
      <head>
      </head>
      <body>
        <h1>Authorized</h1>
      </body>
    </html>
  `);
  res.end()
})

appAuthBasic.listen(8081)

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());

app.use(cors());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get("/", (req, res) => {
  console.log(JSON.stringify(req.headers))
  res.send(`
    <html>
      <head>
      </head>
      <body>
        <p>HELLO</p>
      </body>
    </html>
  `);
  res.end()
})

app.post("/test-post", (req, res) => {
  console.log(JSON.stringify(req.headers))
  console.log(JSON.stringify(req.body))
  res.send(`
    <html>
      <head>
      </head>
      <body>
        <p>HELLO ${req.body.name}!</p>
      </body>
    </html>
  `);
  res.end()
})

app.post("/test-ajax-post", (req, res) => {
  console.log(JSON.stringify(req.headers))
  console.log(JSON.stringify(req.body))
  res.set("Content-Type", "application/json")
  res.send(JSON.stringify({
    "firstname": req.body.firstname,
    "lastname": req.body.lastname,
    "fullname": req.body.firstname + " " + req.body.lastname,
  }))
  res.end()
})

app.get("/test-download-file", (req, res) => {
  console.log(JSON.stringify(req.headers))
  const filePath = path.join(__dirname, 'assets', 'flutter_logo.png');
  const stat = fs.statSync(filePath);
  const file = fs.readFileSync(filePath, 'binary');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'attachment; filename=flutter_logo.png');
  res.write(file, 'binary');
  res.end();
})

app.listen(8082)