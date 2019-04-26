// Import the Firebase SDK for Google Cloud Functions.
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Configure the email transport using the default SMTP transport and a GMail account.
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
});


exports.sendInvitation = functions.database.ref('/invitation/{invitationId}').onWrite(event => {
  const snapshot = event.data;
const val = snapshot.val();
if (snapshot.previous.val()) {
  return;
}

const email = val.email;
const code = val.code;

const mailOptions = {
  from: '"AgReach App" <noreply@firebase.com>',
  to: val.email,
  subject: '',
  html: ''
};

mailOptions.subject = 'You have been invited to use AgReach';
mailOptions.html = '<p>You have been invited to use the AgReach Management Portal.  Your access code is ' + code + '.</p>';
mailOptions.html += "<p>To create an account, <a href='https://agreach-6a5ee.firebaseapp.com/register?email=" + email + "&code=" + code + "'>Click here</a></p>";
mailOptions.html +=  "<p>If the above link doesn't work, you may also manually type the following address into your browser: https://agreach-6a5ee.firebaseapp.com/register?email=" + email + "&code=" + code + "</p>";

return mailTransport.sendMail(mailOptions)
  .then(() => console.log('email sent'))
.catch(error => console.log('error sending email: ', error));

});
