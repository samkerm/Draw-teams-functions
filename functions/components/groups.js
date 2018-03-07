'use strict';
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const groups = module.exports;

groups.search = app.get('/groups/search', (req, res) => {
  console.log('Reached groups/search');

  if (req.query && req.query.string) {
    const string = req.query.string;

    return admin.database().ref('groups/').orderByChild('name')
             .startAt(string)
             .endAt(string + '\uf8ff')
             .on('value', (dataSnapshot) =>
     {
       const data = dataSnapshot.val();
       let groups = [];
       for (const key in data) {
         const group = data[key];
         group.id = key;
         delete group.members;
         groups.push(group);
       }
       return res.send(groups);
     });
  }
  return res.status(403).send('Group search content is missing');
});

groups.create = app.post('/groups/create', (req, res) => {
  console.log('Reached groups/create');

  if (req.body && req.user) {
    const groupData = req.body;
      const userId = req.user.uid;
      console.log(req.user);

      const groupsRef = admin.database().ref('groups/');
      const newGroupKey = groupsRef.push().key;

      // Write the new post's data simultaneously in the posts list and the user's post list.
      let updates = {};
      updates['/groups/' + newGroupKey] = groupData;
      updates['/users/' + userId + '/groupId'] = newGroupKey;
      // updates['/groups' + newGroupKey + '/members'] = {regular: app.state.userId};

      return admin.database().ref().update(updates)
      .then(() => {
        return res.send(true);
      })
      .catch((error) => {
        return res.status(403).send(error);
      });
  }
  return res.status(400).send('Group creation content is missing');
});

groups.join = app.post('/groups/join', (req, res) => {
  console.log('Reached groups/join');

  if (req.query && req.query.groupId && req.user && req.user.uid)
  {
    const userId = req.user.uid;
    const groupId = req.query.groupId;
    const groupsRef = admin.database().ref('groups/' + groupId + '/regulars');
    return groupsRef.once('value').then((snapshot) =>
    {
      const data = snapshot.val();
      console.log(data);
      let regulars = [];
      for (const key in data) {
        regulars.push(data[key]);
      }

      const found = regulars.find(el => el === userId);

      if (found === undefined)
      {
        regulars.push(userId);
      }
      else
      {
        throw new Error('User is already a regular member of this group');
      }
      console.log(regulars);

      let updates = {};
      updates['groups/' + groupId + '/regulars'] = regulars;
      updates['/users/' + userId + '/groupId'] = groupId;
      return admin.database().ref().update(updates);
    }).then((a, b) => {
      console.log('Updated', a, b);
      return res.send(true);
    }).catch((error) => {
      console.error(error.message)
      return res.status(403).send(error.message);
    });
  }
  console.log('Group join content is missing');
  return res.status(400).send('Group join content is missing');
});
