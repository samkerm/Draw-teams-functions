'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const messages = module.exports;

messages.addMessage = app.get('/addMessage', (req, res) => {
  console.log('Reached here');
  if (req.query && req.query.original) {
    const original = req.query.original;
    // Push the new message into the Realtime Database using the Firebase Admin SDK.
    return admin.database().ref('/messages')
      .push({original: original})
      .then(
        (snapshot) =>
        {
          const data = snapshot.key;
          console.log('Received snapshot: ', data);
          // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
          return res.send(data);
        }
      ).catch(
        err =>
        {
          return res.status(403).send(err);
        }
    );
  }
  return res.status(403).send('Message content is missing');
});
