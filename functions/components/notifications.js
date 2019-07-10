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
 * Send notifications to userIds.
 * @param {string} title - The title of the notification.
 * @param {string} description - The description of the notification.
 * @param {object} data - The content of the notification.
 * @param {object} userIds - The users we want to send notifications to.
*/
notifications.sendPushNotificationTo = (title, description, data, userIds) => {
    const notification = {};
    if (!_.isEmpty(title) && !_.isEmpty(description)) {
        notification.title = title;
        notification.description = description;
        notification.badge = "1";
    }

    if (!_.isEmpty(userIds)) {
        const userTokens = userIds.map(id => getDeviceTokenForUser(id));
        if (!_.isEmpty(userTokens)) notifications.sendPushNotification(notification, data, userTokens)
    }
};

/**
 * Send silent notifications to userIds.
 * @param {object} data - The content of the notification.
 * @param {object} userIds - The users we want to send notifications to.
 */
notifications.sendSilentPushNotificationTo = (data, userIds) => {
    if (!_.isEmpty(userIds)) {
        const userTokens = userIds.map(id => getDeviceTokenForUser(id));
        if (!_.isEmpty(userTokens)) notifications.sendPushNotification({}, data, userTokens)
    }
};

notifications.sendPushNotification = (notification, data, regTokens) => {
    Promise.all(regTokens)
    .then((tokens) => {
        // Filter out bad tokens
        tokens = tokens.filter((val) => val !== null && typeof val === 'string' && val !== '');
        // Prepare a message to be sent
        const message = {
            notification,
            data,
        };
        console.log(message, tokens);
        return admin.messaging().sendToDevice(tokens, message);
    })
    .then((response) => {
        console.log(response);
        return response;
    })
    .catch((error) => {
        console.error(error);
    })   
};