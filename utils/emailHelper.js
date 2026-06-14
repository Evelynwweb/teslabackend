const emailjs = require('@emailjs/nodejs');

const sendEmailJS = async (templateID, templateParams) => {
  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      templateID,
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY
      }
    );
    console.log('Email sent successfully:', response.status);
    return response;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

module.exports = sendEmailJS;