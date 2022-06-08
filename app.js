//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require('express-session');
const cookieParser = require("cookie-parser");
const request = require('request');
const https = require("https");
const open = require("open");

const app = express();

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: clientSecret,
    cookie: {
        maxAge: 60000
    },
    resave: false,
    saveUninitialized: false
}));
app.use(cookieParser());



// GET requests for main pages - login, register and home. -----------------------------
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/loginSuccess", (req, res) => {
    res.render("loginSuccess");

    let sessionData = req.session;
    let userObj = {};
    if (sessionData.user) {
        userObj = sessionData.user;
    };
    res.json(userObj);
});

app.get("/loginFail", (req, res) => {
    res.render("loginFail");
});

app.get("/logout", (req, res) => {
    //access_token = undefined;
    res.render("logout");
});

app.get("/authSession", (req, res) => {
    res.render("authSession");
});

// ----------------------------------------------------------------
// request access token from auth server with enpoint, client id and client secret
const auth = 'Basic ' + Buffer.from(clientID + ':' + clientSecret).toString('base64');
const grantType = "client_credentials";
const scope = "identify";
const urlGetAccessToken = "https://api.signicat.io/oauth/connect/token"; //access token url
const urlSessionIdentification = 'https://api.signicat.io/identification/v2/sessions';


function createSession(a, t) {
    let Authorization = t + " " + a;
    console.log("Authorization: bearer + access token: " + Authorization);

    // for new sessions
    // 2. ------------------------- START IDENTIFICATION SESSION -------------------
    const newSesionOptions = {
        'method': 'POST',
        'url': urlSessionIdentification,
        'headers': {
            'Authorization': Authorization,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "flow": "redirect",
            "allowedProviders": [
                "no_bankid_netcentric"
            ],
            "include": [
                "name",
                "date_of_birth"
            ],
            "redirectSettings": {
                "successUrl": "/loginSuccess",
                "abortUrl": "/loginFail",
                "errorUrl": "/loginFail"
            }
        })
    };
    request(newSesionOptions, (error, response) => {
        if (error) {
            console.log(error);
        };
        let obj = JSON.parse(response.body);
        let sessionId = obj["id"];
        let urls = obj["url"];
        console.log(urls)
        let sessRetr = urlSessionIdentification + "/" + sessionId; 

        open(urls);

        // ----------- RETRIEVE SESSION DATA ----------------
        //let sessionRetrieveOptions = {
        //    'method': 'GET',
        //    'url': sessRetr,
        //    'headers': {
        //        'Authorization': Authorization
        //    }
        //};
        //request(sessionRetrieveOptions, function (error, response) {
        //    if (error) {
        //        console.log(error);
        //    } else {
        //        let obj = JSON.parse(response.body);
        //        let userFullName = obj["identity"]["fullName"];
        //        let userBD = obj["identity"]["dateOfBirth"];
//
        //        console.log("full name: " + userFullName);
        //        console.log("date of birth: " + userBD);
        //    };
        //});

    });
    // --------------------------------------------------------------------------
};

function getAccessToken(error, response) {
    if (error) {
        console.log(error);
    } else {
        let obj = JSON.parse(response.body);
        let accToken = obj["access_token"];
        let tokenType = obj["token_type"];
        console.log("access token: " + accToken);
        createSession(accToken, tokenType);
    };
};

//app.post("/authSession", (req, res) => {
//  1 ------------------------- REQUEST AUTHENTICATION TOKEN -------------------
const authTokParams = {
    'method': 'POST',
    'url': urlGetAccessToken,
    'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': auth
    },
    form: {
        'grant_type': grantType,
        'scope': scope
    }
};
//console.log(authTokParams);
https.get(urlGetAccessToken, function (response) {
    request(authTokParams, getAccessToken);
});
//console.log("up until here");
// ----------------------------------------------------------------------------
//});



// listen for server
app.listen(3000, function () {
    console.log("Server started on port 3000");
});

