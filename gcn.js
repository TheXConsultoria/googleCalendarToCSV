var fs = require('fs'),
    readline = require('readline'),
    google = require('googleapis'),
    googleAuth = require('google-auth-library'),
    colors = require('colors');


var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'],
    TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/',
    TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


/// Leitura do arquivo com as informações do OAuth2
/// Para criar o seu acesse, siga os seguintes passos: https://developers.google.com/google-apps/calendar/quickstart/nodejs#step_1_turn_on_the_api_name
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Não foi possível encontrar seu arquivo "client_secret.json": '.red + err);
        return;
    }
    
    authorize(JSON.parse(content), listEvents);
});

/**
 * Cria um link para o processo de OAuth2 do google 
 *
 * @param {Object} credentials As credencias de acesso client.
 * @param {function} callback O callback para quando o cliente for autorizado.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret,
        clientId = credentials.installed.client_id,
        redirectUrl = credentials.installed.redirect_uris[0],
        auth = new googleAuth(),
        oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    
    // Verifica se já não possuimos um token autorizado
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Obtem o token após pedir ao usuário para autenticar e, em seguida executa
 * o callback do OAuth2
 *
 * @param {google.auth.OAuth2} oauth2Client Cliente OAuth2 com dados que precisamos.
 * @param {getEventsCallback} callback Callback de autorização
 */
function getNewToken(oauth2Client, callback) {
    
    var authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    
    console.log();
    console.log('Para autorizar o acesso, visite o link abaixo: '.yellow);
    console.log();
    console.log(authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    console.log();
    rl.question('Entre aqui o código gerado pelo link anterior: '.cyan, function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Não foi possível validar o token de acesso!'.red, err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Salva o token no disco para futuras utiliações
 *
 * @param {Object} token O token que queremos salvar
 */
function storeToken(token) {
    
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lista os próximos 10 eventos do calendário.
 *
 * @param {google.auth.OAuth2} auth Cliente OAuth.
 */
function listEvents(auth) {
    var calendar = google.calendar('v3');
    calendar.events.list({
        auth: auth,
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
    }, function (err, response) {
        if (err) {
            console.log('A API retornou um erro: '.red + err);
            return;
        }
        var events = response.items;
        if (events.length == 0) {
            
            console.log('Nenhum evento encontrado.'.yellow);
        } else {
            
            console.log('Eventos encontrados:'.green);
            
            var data = "";
            for (var i = 0; i < events.length; i++) {
                
                var event = events[i];
                var start = event.start.dateTime || event.start.date;
                console.log('%s - %s', start, event.summary);
                
                /// Formato do CSV:
                /// [sumário];[data início];[data fim];[local];[email do organizador];[nome do organizador];
                data += event.summary + ";" +
                        start + ";" +
                        (event.end.dateTime || event.end.date) + ";" +
                        event.location + ";" +
                        event.organizer.email + ";" +
                        event.organizer.displayName + ";" +
                        "\n";
            }
            
            fs.writeFile('eventos.csv', data, 'utf8', function (err) {
                if (err) { return console.log(err); }
                console.log('Fim!'.green);
            });
        }
    });
}