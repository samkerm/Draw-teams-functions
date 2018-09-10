'use-strict'
const admin = require('firebase-admin');
const _ = require('lodash');

const notifications = module.exports;

function getDeviceTokenForUser(userId) {
    return new Promise((resolve, reject) => {
        admin.database().ref('users/' + userId).once('value')
            .then((snapshot) => {
                const user = snapshot.val();
                if (user && user.token) {
                    return resolve(user.token);
                }
                return resolve();
            })
            .catch((error) => {
                return reject(error);
            })
    });
}

/**
 * Sen notifications to userIds.
 * @param {string} title - The title of the notification.
 * @param {string} msg - The body of the notification.
 * @param {object} userIds - The users we want to send notifications to.
*/
notifications.sendPushNotificationTo = (title, msg, userIds) => {
    if (!_.isEmpty(userIds)) {
        const userTokens = userIds.map(id => getDeviceTokenForUser(id));
        notifications.sendPushNotification(title, msg, userTokens)
    }
};

notifications.sendPushNotification = (title, body, regTokens) => {
    Promise.all(regTokens)
    .then((tokens) => {
        // Filter out bad tokens
        tokens = tokens.filter((val) => val != null && typeof val === 'string' && val !== '');
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
        console.log(response);
    })
    .catch((error) => {
        console.error(error);
    })   
};