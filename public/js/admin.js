const firebase = require("firebase-admin");

const serviceAccount = require("./firebaseAccountKey.json");

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
});
const db = firebase.firestore();
let data = await db.collection('admin').doc('superadmin').get();

$(document).ready(function () {
    $("#submitBtn").click(function () {
        $("#myForm").submit(); // Submit the form
    });
});