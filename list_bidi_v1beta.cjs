const https = require('https');
const apiKey = "AIzaSyCOh8KwBP_AduDXayVXpf1L73Vzrf0pAq0";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const models = JSON.parse(data).models;
    if (models) {
      console.log(models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('bidiGenerateContent')));
    } else {
        console.log(data);
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
