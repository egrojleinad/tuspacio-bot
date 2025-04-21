// TuSpacio Salon WhatsApp Bot
// Autor base: Jorge Colmenares
// Adaptación completa para salón de belleza por ZAPIKEY AI

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER;
const notifyTo = 'whatsapp:+51986040443';

const twilioClient = twilio(accountSid, authToken);
app.use(bodyParser.urlencoded({ extended: false }));

const clients = {};
const timeouts = {};

const showMainMenu = () => (
`💅 *Bienvenid@ a TuSpacio Salon* 💇‍♀️💇‍♂️
Por favor, elige una de las siguientes opciones:

1. Agendar una cita para *Cabello*
2. Agendar una cita para *Uñas*
3. 📋 Ver listado de *servicios y precios*
4. 💬 Hablar con una *asesora*
5. 🕒 Consultar *horarios* del salón
6. 📍 Ver *dirección* del salón
7. 💳 Número de cuenta *para transferencias*
8. 📱 Número de celular *para SINPE*
0. ❌ Terminar la sesión

📝 En cualquier momento, escribe 0 para volver al Menú Principal.`
);

const submenuPelo = () => (
`💇‍♀️ *Agendar una cita para cabello*
1️⃣ Corte de cabello ✂️
2️⃣ Tinte, decoloración o similares 🎨
3️⃣ Tratamiento especial 💆‍♀️

0️⃣ Volver al Menú Principal`
);

const submenuUnas = () => (
`💅 *Agendar una cita para Uñas*
1️⃣ Manos 💅
2️⃣ Pies 🦶
3️⃣ Manos y Pies 💅🦶

0️⃣ Volver al Menú Principal`
);

const returnToMainMenu = (client, twiml) => {
  client.step = 'menu';
  twiml.message(showMainMenu());
  setInactivityTimeout(client, client.phone);
};

const notifySalon = async ({ nombre, telefono, fecha, hora, servicio, detalle = '' }) => {
  const mensaje = `📌 *Nueva solicitud de cita:*
👤 *Nombre:* ${nombre}
📱 *Teléfono:* ${telefono}
📅 *Fecha:* ${fecha}
🕐 *Hora:* ${hora}
💼 *Servicio:* ${servicio}${detalle ? `
📝 *Detalle:* ${detalle}` : ''}`;
  console.log('Enviando a WhatsApp:', mensaje);
  await twilioClient.messages.create({ body: mensaje, from: whatsappFrom, to: notifyTo });
  console.log('✅ Mensaje enviado al salón con éxito');
};

const sendWithDelay = (twiml, firstMsg, secondMsg) => {
  const formattedFirstMsg = formatResponse(firstMsg);
  const formattedSecondMsg = formatResponse(secondMsg);
  twiml.message(formattedFirstMsg);
  twiml.message(formattedSecondMsg);
};

const formatResponse = (msg) => msg; // Restored for future formatting extensions

const setInactivityTimeout = (client, from) => {
  if (timeouts[from]) clearTimeout(timeouts[from]);
  timeouts[from] = setTimeout(() => {
    const message = `⌛ *¿Sigues ahí?*
Parece que ha pasado un tiempo sin respuesta. Hemos reiniciado la sesión. Aquí tienes el menú principal nuevamente:`;
    delete clients[from];
    twilioClient.messages.create({
      from: whatsappFrom,
      to: from,
      body: `${message}\n\n${showMainMenu()}`
    });
  }, 300000);
};

const endSession = (client, twiml, from) => {
  const farewell = `🙏 Agradecemos elegir TuSpacio Salon. Te esperamos pronto. Si tienes algo que comentarnos para seguir mejorando, por favor, escribe aquí:
✏️ *Escribe tu comentario o sugerencia ahora.*
🛑 *Escribe 0 si no deseas enviar ningún comentario.*`;
  client.step = 'end_feedback';
  twiml.message(farewell);
};

// Restaurar webhook funcional
app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  if (!clients[from]) {
    clients[from] = { step: 'ask_name', name: '', temp: {}, phone: from };
    twiml.message('👋 ¡Hola! Bienvenid@ a *TuSpacio Salon*. ¿Podrías decirme tu nombre para empezar?');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  const client = clients[from];
  setInactivityTimeout(client, from);

  if (client.step === 'ask_name') {
    client.name = msg;
    client.step = 'menu';
    sendWithDelay(twiml, `¡Gracias, ${client.name}!`, showMainMenu());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  if (msg === '0') {
    endSession(client, twiml, from);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  // Lógica completa del flujo de conversación
  switch (client.step) {
    case 'menu':
      switch (msg) {
        case '1': client.step = 'pelo_menu'; twiml.message(submenuPelo()); break;
        case '2': client.step = 'unas_menu'; twiml.message(submenuUnas()); break;
        case '3': sendWithDelay(twiml, '📋 Descarga aquí la lista de nuestros servicios y los precios: https://example.com/servicios', showMainMenu()); break;
        case '4': {
  const now = new Date();
  const fechaHoy = now.toLocaleDateString('es-CR');
  const horaAhora = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  await notifySalon({ nombre: client.name, telefono: from, fecha: fechaHoy, hora: horaAhora, servicio: 'Asesoría directa' });
  sendWithDelay(twiml, `💬 Pronto te pondremos en contacto con una asesora. Si no respondemos, llama al 📞 7229 7263`, showMainMenu());
  break;
}
          break;
        case '5': sendWithDelay(twiml, '🕒 Horarios: https://example.com/horarios', showMainMenu()); break;
        case '6': sendWithDelay(twiml, '📍 Dirección: Cartago, El Guarco. Waze: https://waze.com/aaaaa', showMainMenu()); break;
        case '7': {
  sendWithDelay(twiml, `💳 Número de cuenta BAC: CRlflfkkfkfk
Envía el comprobante a WhatsApp 7229 7263 con tu nombre y servicio.`, showMainMenu());
  break;
}
        case '8': {
  sendWithDelay(twiml, `📱 SINPE móvil: 7229 7263
Envía el comprobante a WhatsApp 7229 7263 con tu nombre y servicio.`, showMainMenu());
  break;
}
        case '9':
        case '0':
          endSession(client, twiml, from);
          break;
        default:
          twiml.message('❗ Opción no válida. Por favor elige una opción del menú.');
          twiml.message(showMainMenu());
      }
      break;

    case 'pelo_menu':
      if (['1', '2', '3'].includes(msg)) {
        client.temp.servicio = ['Corte de cabello ✂️', 'Tinte o decoloración 🎨', 'Tratamiento especial 💆‍♀️'][parseInt(msg) - 1];
        client.step = 'pelo_fecha';
        twiml.message('📅 ¿En qué fecha desea el servicio?');
      } else if (msg === '0') {
        returnToMainMenu(client, twiml);
      } else {
        sendWithDelay(twiml, '❗ Opción inválida.', submenuPelo());
      }
      break;

    case 'pelo_fecha':
      client.temp.fecha = msg;
      client.step = 'pelo_hora';
      twiml.message('🕐 ¿En qué horario?');
      break;

    case 'pelo_hora':
      client.temp.hora = msg;
      if (client.temp.servicio.includes('Tratamiento especial')) {
        client.step = 'pelo_detalle';
        twiml.message('📝 Por favor, especifica qué tratamiento deseas.');
      } else {
        notifySalon({ nombre: client.name, telefono: from, ...client.temp });
        sendWithDelay(twiml, '✅ Nos comunicaremos pronto con usted para confirmar la cita.', showMainMenu());
        client.step = 'menu';
      }
      break;

    case 'pelo_detalle':
      client.temp.detalle = msg;
      notifySalon({ nombre: client.name, telefono: from, ...client.temp });
      sendWithDelay(twiml, '✅ Nos comunicaremos pronto con usted para confirmar la cita.', showMainMenu());
      client.step = 'menu';
      break;

    case 'unas_menu':
      if (['1', '2', '3'].includes(msg)) {
        client.temp.servicio = ['Uñas - Manos 💅', 'Uñas - Pies 🦶', 'Uñas - Manos y Pies 💅🦶'][parseInt(msg) - 1];
        client.step = 'unas_fecha';
        twiml.message('📅 ¿En qué fecha desea el servicio?');
      } else if (msg === '0') {
        returnToMainMenu(client, twiml);
      } else {
        sendWithDelay(twiml, '❗ Opción inválida.', submenuUnas());
      }
      break;

    case 'unas_fecha':
      client.temp.fecha = msg;
      client.step = 'unas_hora';
      twiml.message('🕐 ¿En qué horario?');
      break;

    case 'unas_hora':
      client.temp.hora = msg;
      if (client.temp.servicio.includes('Manos y Pies')) {
        client.step = 'unas_detalle';
        twiml.message('📝 Por favor, especifica qué tratamiento deseas.');
      } else {
        notifySalon({ nombre: client.name, telefono: from, ...client.temp });
        sendWithDelay(twiml, '✅ Nos comunicaremos pronto con usted para confirmar la cita.', showMainMenu());
        client.step = 'menu';
      }
      break;

    case 'unas_detalle':
      client.temp.detalle = msg;
      notifySalon({ nombre: client.name, telefono: from, ...client.temp });
      sendWithDelay(twiml, '✅ Nos comunicaremos pronto con usted para confirmar la cita.', showMainMenu());
      client.step = 'menu';
      break;

    case 'end_feedback':
      if (msg !== '0') {
        const now = new Date();
        const fechaHoy = now.toLocaleDateString('es-CR');
        const horaAhora = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        await notifySalon({ nombre: client.name, telefono: from, fecha: fechaHoy, hora: horaAhora, servicio: 'Comentario Final', detalle: msg });
        twiml.message('🙏 ¡Gracias por tu comentario! Te esperamos pronto en TuSpacio Salon.');
      } else {
        twiml.message('🚫 Comentario cancelado. ¡Te esperamos pronto en TuSpacio Salon!');
      }
      delete clients[from];
      break;

    default:
      client.step = 'menu';
      twiml.message(showMainMenu());
      break;
  }
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(port, () => {
  console.log(`🚀 TuSpacio Salon Bot ejecutándose en http://localhost:${port}`);
});
