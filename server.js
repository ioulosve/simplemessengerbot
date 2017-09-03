//un webhook è un modo per estendere il concetto di Callback al mondo HTTP. Si può usare ad esempio al posto del polling.
//quando si verifica un evento su un sito, allora si manda un messaggio POST all'URL specificato come fosse una notifica.

//API.AI token
const CLIENT_ACCESS_TOKEN = 'e4caf9a0c1874f2a8b4289ae2a328b82';

//FACEBOOK access token
var PAGE_ACCESS_TOKEN = 'EAAD8ilAXdgEBACqaUQjmEOEx5f3JPAwUCed2qPsQswJwnZAc5tKTaRKxtqrgCkmMLmGvhyHb2e2EOTpB8LdZCfgiCoNdmZBKHPtBz76QjTeiBz5ZAjdzXUC83VRAlUEfJfxArtBl9srU5cvohQZAo4o1XSMIZCJ4vTaRrsJZCni0wZDZD';

//REST API Key for OpenWeatherMap.org service
const WEATHER_API_KEY = '503f68190d246086ab7c1c4c5db52c05';


var express = require('express'); //Modulo perr fare un webserver (alternativa a 'http')
var bodyParser = require('body-parser'); //Modulo per parsare contenuto di un messaggio HTTP
const request = require ('request'); //Modulo per fare chiamate http.
const apiaiApp = require('apiai')(CLIENT_ACCESS_TOKEN); //modulo di api.ai

var app = express();

//bodyParser popola la proprietà req.body col body parsato in json in questo caso.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  
    //req.query contiene i parametri dopo ? nell'url, ad esempio:
    // http://www.google.com/hi/there?qs1=you&qs2=tube
    // req.query['qs1'] --> you 
    // req.query['qs2'] --> tube

    if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
      res.status(200).send(req.query['hub.challenge']);
      
    } else {
      res.status(403).end();
    }
  });
  
  /* Handling all messenges */
  app.post('/webhook', (req, res) => {

    //stampa nella console il corpo del messaggio POST
    console.log(req.body);
    
    if (req.body.object === 'page') {
      req.body.entry.forEach((entry) => {
        entry.messaging.forEach((event) => {
          if (event.message && event.message.text) {
            //invoca la funzione sendMessage che ti scrivo giù
            sendMessage(event);
          }
        });
      });
      res.status(200).end();
    }
  });

  /*a POST method route per il meteo*/
  
app.post('/ai', (req, res) => {

  console.log(req.body);

  if(req.body.result.action === 'meteo') { //la req viene fa
   
    let city = req.body.result.parameters['geo-city'];
    let restUrl = 'http://api.openweathermap.org/data/2.5/weather?lang=it&units=metric&APPID='+WEATHER_API_KEY+'&q='+city;

    //invia una get all'URL di openweathermap
    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {
        let json = JSON.parse(body);
        let msg = json.weather[0].description + ' e la temperatura è di ' + json.main.temp + ' °C';

        //la risposta ricevuta viene ritornata sotto forma di JSON 
        return res.json({
          speech: msg,
          displayText: msg,
          source: 'weather'});
      } else {
        return res.status(400).json({
          status: {
            code: 400,
            errorType: 'I failed to look up the city name.'}});
      }})
  }
});



  //mette il server in ascolto sulla porta 5000 e registra la callback da lanciare quando qualcuno si connette
var server = app.listen(8080, () => {
      //viene eseguito questo codice quando qualcuno si connette alla porta 5000
      console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env); 
  });
  
//event è una variabile implicita che si passa come argomento a funzioni che hanno lo scopo di 'event handler'.
//la variabile event rappresenta l'evento accaduto da cui si possono estrarre i parametri


function sendMessage(event) {

  let sender = event.sender.id;  //l'id dell'utente che ha inviato il messaggio al bot
  let text = event.message.text; //il messaggio inviato dall'utente
  //crea un oggetto request

  
  //con questa chiamata, inviamo il messaggio 'text' ad api.ai
  let apiai = apiaiApp.textRequest (text, {
    sessionId : 'tabby_cat' //un id arbitrario
  });
 
  
  //quando API ha la risposta, l'evento 'response' viene emesso e qui dobbiamo inviare la risposta a Messenger
  //cosicché l'utente la veda come risposta dal bot 
  apiai.on('response', (response) => {
      //got a response from api.ai, let's POST to facebook messenger

      let aiText = response.result.fulfillment.speech;

      //il messaggio JSON da mandare a messenger
      request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
          recipient: {id: sender},
          message: {text: aiText}
        }
      }, (error, response) => {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
      });

  });


  apiai.on('error', (error) => {
    console.log(error);
  });

  //invio della risposta
  apiai.end();

}
