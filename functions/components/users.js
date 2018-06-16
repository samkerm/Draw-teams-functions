'use strict';
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const users = module.exports;

users.updateDisplayName = app.post('/users/updateDisplayName', (req, res) => {
  console.log('Reached users/updateDisplayName');

  if (req.body, req.user)
  {
    const body = JSON.parse(req.body);
    console.log(`Requested displayName update: ${body.displayName}, by user: `, req.user.uid);
    return admin.auth().updateUser(req.user.uid, {displayName: body.displayName}).then((user) => {
      console.log('Update successful');
      return res.send(user);
    }).catch((error) => {
      console.log('Update failed: ', error.message);
      return res.status(403).send(new Error('Update failed'));
    });
  }
  return res.status(400).send('Update Display Name content is missing');
});

users.initializeUserWithRatings = app.post('/users/initializeUserWithRatings', (req, res) => {
  console.log('Reached users/initializeUserWithRatings');

  if (req.body, req.user)
  {
    const body = JSON.parse(req.body);
    let newUser;
    return admin.auth().updateUser(req.user.uid, {
        displayName: body.displayName,
      })
      .then((userRecord) =>
      {
        newUser = userRecord.toJSON();
        console.log('Successfully updated user', newUser);
        return admin.database().ref('users/' + newUser.uid).set({
          displayName: body.displayName,
          ratings: body.ratings,
        });
      })
      .then(() => {
        console.log('Initialization processed');
        return res.status(200).send(newUser);
      })
      .catch((error) =>
        {
          console.log('Initialization failed: ', error.message);
          return res.status(403).send(new Error('Initialization failed'));
        });
  }
  return res.status(400).send('Initialization body or user is missing');
});

users.getUserInfo = app.get('/getUserInfo', (req, res) => {
  console.log('Reached users/userId');

  if (req.query && req.query.userId)
  {
    const userId = req.query.userId;
    let userInfo;
    return admin.database().ref('users/' + userId).once('value')
    .then((snapshot) =>
    {
      console.log('successfully received user data', snapshot.val());
      userInfo = snapshot.val();
      userInfo.userId = userId;
      return admin.auth().getUser(userId)
    })
    .then((firebaseUser) =>
    {
      userInfo.photoURL = firebaseUser.photoURL || '';
      return res.send(userInfo);
    })
    .catch((error) => {
      console.log('User data retrival failed: ', error.message);
      return res.status(403).send(error);
    });
  }
  return res.status(400).send('User id is missing in the query');
});
