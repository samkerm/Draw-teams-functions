'use strict';
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const users = module.exports;

users.updateDisplayName = app.post('/users/updateDisplayName', (req, res) => {
  console.log('Reached users/updateDisplayName');

  if (req.body, req.user)
  {
    console.log(`Requested displayName update: ${req.body.displayName}, by user: `, req.user.uid);
    return admin.auth().updateUser(req.user.uid, {displayName: req.body.displayName}).then((user) => {
      console.log('Update successful');
      return res.send(user);
    }).catch((error) => {
      console.log('Update failed: ', error.message);
      return res.status(403).send(error);
    });
  }
  return res.status(403).send('Update Display Name content is missing');
});

users.initializeUserWithRatings = app.post('/users/initializeUserWithRatings', (req, res) => {
  console.log('Reached users/initializeUserWithRatings');

  console.log(req.body, req.user);
  if (req.body, req.user)
  {
    const reference = admin.database().ref('users/' + req.user.uid);
    return reference.set({
        displayName: req.body.displayName,
        ratings: req.body.ratings,
      }).then(() =>
      {
        console.log('Initialization procesing val');
       return reference.once("value");
      }).then((snapshot) =>
      {
        console.log('Initialization successful with data snapshot', snapshot.val());
        return res.send(snapshot.val());
      }).catch((error) =>
      {
        console.log('Initialization failed: ', error.message);
        return res.status(403).send(error);
      });
  }
  return res.status(403).send('Initialization body or user is missing');
});
