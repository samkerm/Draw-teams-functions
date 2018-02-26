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

  if (req.body, req.user) {
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
  return res.status(403).send('Group creation content is missing');
});
