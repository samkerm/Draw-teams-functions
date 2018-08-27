'use-strict'
const admin = require('firebase-admin');

exports.sendPushNotification = (title, body, regTokens) => {
    
    Promise.all(regTokens).then((tokens) => {
        return tokens;
    })
    .then((tokens) => {
        // Prepare a message to be sent
        const message = {
            notification: {
                title,
                body,
                badge: '1'
            },
        };
        return admin.messaging().sendToDevice(tokens, message);
    })
    .then((response) => {
        return response;
    })
    .catch((error) => {
        return error;
    })   
};