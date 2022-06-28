// Piyara Imporet

const cilent_socket_id = require("./extra/socket-maintain");

const express = require("express");
var parseUrl = require('body-parser');
let encodeUrl = parseUrl.urlencoded({ extended: false });


require("dotenv").config();
const path = require("path");
var app = express();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const GOOGLE_CLIENT_ID =
    process.env.Google_Client || "889765114531-79roj7vk9r3fjf155hp7tspgp3o6qr2l.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.Google_Secret || "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";
var userProfile;
var getMeetingId;


// Fire Base
$env: GOOGLE_APPLICATION_CREDENTIALS = "./screen-share-41a40-firebase-adminsdk-vkmpj-d9a388fc11.json"

const firebase = require("firebase-admin");

const serviceAccount = require("./firebaseAccountKey.json");

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    // databaseURL: 'https://screen-share-41a40-default-rtdb.firebaseio.com/'
});

const db = firebase.firestore();

// Fire Base Ends

app.set("view engine", "ejs");
app.use(
    session({
        resave: false,
        saveUninitialized: true,
        secret: "SECRET",
    })
);
app.use(express.static(path.join(__dirname, "")));
app.get("/", (req, res) => {
    res.render("index");
});
app.get("/home", (req, res) => {
    res.render("home", { user: userProfile });
});
app.get("/admin", (req, res) => {
    res.render("admin");
});

app.get('/sample-api', (req, res) => {
    res.json({ text: 'Lorem Ipsum' });
});
app.post('/adminrequest', encodeUrl, async (req, res) => {
    console.log('Form request:', req.body.username)
    if(await getAdmin(req.body.username, req.body.password)){
        let usersData = await getDashboardData()
        res.render("admindashboard", { users: usersData});
    }
    else{
        res.redirect('admin');
      
    }
})



app.get("/join", (req, res) => {
    res.render("join");
});
app.get("/meeting", (req, res) => {
    res.render("meeting");
});
app.get("/more", (req, res) => {
    res.render("more");
});
app.get("/new-meeting", (req, res) => {
    res.render("new-meeting", { meetingId: getMeetingId });
});
app.get("/participant-mobile", (req, res) => {
    res.render("participant-mobile");
});
app.get("/privacy-web", (req, res) => {
    res.render("privacy-web");
});
app.get("/about-web", (req, res) => {
    res.render("about-web");
});


app.use(passport.initialize());
app.use(passport.session());




passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

async function getDbData(val) {
    let data = await db.collection('users').doc(val).get();
    if (!data.exists) {
        addNewData(val)
        console.log('No document');
    } else {
        console.log(data.data().meetingId);
        cilent_socket_id.s_id = data.data().meetingId;
        getMeetingId = cilent_socket_id.s_id;
    }
}

async function getAdmin(username, password) {
    let data = await db.collection('admin').doc('superadmin').get();
    console.log(data.data());
    let user = data.data().username;
    let pass = data.data().password;
    if (user === username && pass === password) {
        console.log("true");
       return true;
    }
    console.log("falase")

    return false;
    
}
async function getDashboardData(){
    const snapshot = await firebase.firestore().collection('users').get()
    console.log(snapshot.docs.map(doc => doc.data()));
    return snapshot.docs.map(doc => doc.data());
     
}

async function addNewData(val) {
    const usersDb = db.collection('users');
    const newUser = await usersDb.doc(val);
    let rand_meeting_id = Math.floor(Math.random() * 100000000);

    // console.log("rand_meeting_id");
    // console.log(rand_meeting_id);

    const meetingDB = db.collection('meetings');

    while (true) {
        let meetings = await db.collection('meetings').doc(rand_meeting_id.toString()).get();
        if (!meetings.exists) {
            let newMeeting = await meetingDB.doc(rand_meeting_id.toString());
            cilent_socket_id.s_id = rand_meeting_id;
            getMeetingId = rand_meeting_id;
            newUser.set({
                name: userProfile.displayName,
                email: val,
                meetingId: rand_meeting_id,
            });
            newMeeting.set({
                email: val,
                meetingId: rand_meeting_id,
            })
            break;
        } else {
            rand_meeting_id = Math.floor(Math.random() * 100000000);
        }
    }


}
passport.use(
    new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        //callbackURL: "https://screen-sharing-application.herokuapp.com/auth/google/callback",
        callbackURL: "http://localhost:4000/auth/google/callback",
    },
        async function (accessToken, refreshToken, profile, done) {
            userProfile = profile;
            // console.log(userProfile);
            await getDbData(userProfile._json.email)


            return done(null, userProfile);
        }
    )
);

app.get("/error", (req, res) => res.send("error logging in"));
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/error" }),
    function (req, res) {
        // Successful authentication, redirect success.
        // console.log(`User Profile is ${userProfile.displayName}`)
        // res.render('/home', { user: userProfile });
        res.redirect("/home");
    }
);

const port = process.env.PORT || 4000;
var server = app.listen(port, function () {
    console.log("Listening on port 4000");
});


const io = require("socket.io")(server, {
    allowEIO3: true, // false by default
});
var userConnections = [];
io.on("connection", (socket) => {
    console.log("Socket Id is", socket.id);

    // socket.id = cilent_socket_id.id;
    socket.on("userconnect", (data) => {
        // console.log("cilent_socket_id.s_id")
        // console.log(cilent_socket_id.s_id)

        data.meetingid = cilent_socket_id.s_id
        console.log("userconnent", data.displayName, data.meetingid);
        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meetingid
        );
        //Other Users whose meeting id matches with the room meeting id
        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,
        });
        console.log(userConnections);
        //These are all the user connection which are happening on this server 4000. It contains my as well other's connection info.
        var userCount = userConnections.length;
        console.log(userCount);
        //Kitne users hain abhi us room mein
        other_users.forEach((v) => {
            socket.to(v.connectionId).emit("inform_others_about_me", {
                other_user_id: data.displayName, //Sending our name
                connId: socket.id, //We are sending our socket connid
                userNumber: userCount,
            });
        });
        //Baki jitne bhi users hain ham unko inform karenge ki ham bhi hain is room mein
        //So we will send our information to their connection id
        // ======================================================================
        socket.emit('storeClientInfo', { customId: data.meetingid });

        socket.emit("inform_me_about_other_user", other_users);
    });
    //Informing me of other Users
    socket.on("SDPProcess", (data) => {
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id,
        });
        //Here we are sending our data to other users. For creating connection
        //Letting other users to know about me
    });
    //We are connecting the server with client through socket.id server->index.html(ajax/socket.io)->app.js(socket.io)
    socket.on("sendMessage", (msg) => {
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id);
        if (mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("showChatMessage", {
                    from: from,
                    message: msg,
                });
            });
        }
    });
    socket.on("disconnect", function () {
        console.log("Disconnected");
        var disUser = userConnections.find((p) => p.connectionId == socket.id);
        if (disUser) {
            var meetingid = disUser.meeting_id;
            userConnections = userConnections.filter(
                (p) => p.connectionId != socket.id
            );
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                var userNumberAfUserLeave = userConnections.length;
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
                    connId: socket.id,
                    uNumber: userNumberAfUserLeave,
                });
            });
        }
    });
});