const assert = require('node:assert/strict');
const {buildCountdownEvents,buildEventsJsonLd,parseDate} = require('./update-shows');
const show={name:'Sala de prueba',date:'2026-10-31',city:'Santander',url:'',venue:''};
assert.match(buildCountdownEvents([show]),/dateOnly:"2026-10-31"/);
assert.match(buildEventsJsonLd([show]),/"startDate": "2026-10-31"/);
assert.equal(buildCountdownEvents([]),'');
assert.equal(parseDate('2026-10-31').day,31);
assert.match(buildCountdownEvents([{...show,date:'2026-10-31T22:30:00+01:00'}]),/2026-10-31T21:30:00.000Z/);
assert.match(buildEventsJsonLd([{...show,date:'2026-10-31T22:30:00+01:00'}]),/2026-10-31T22:30:00\+01:00/);
assert.throws(()=>buildCountdownEvents([{...show,date:'2026-10-31T22:30:00'}]),/zona/);
console.log('7 comprobaciones: fechas sin hora, hora confirmada, zona y lista vacía.');

const {buildPastCalendar}=require('./update-shows');
const past={...show,date:'2026-10-09',estado:'Cobrado'};
assert.deepEqual(buildPastCalendar([past],'2026-10-24'),[{date:'2026-10-09',city:'Santander'}]);
assert.deepEqual(buildPastCalendar([{...past,estado:'cancelado'},{...past,estado:'No e pinchado'},{...past,estado:'Sin Finalizar'},{...past,name:'Boda privada'}],'2026-10-24'),[]);
assert.deepEqual(buildPastCalendar([{...past,date:'2026-11-21'}],'2026-10-24'),[]);
console.log('Histórico: solo fecha/ciudad, sin cancelados, privados o futuros.');

const {buildOccupiedDates}=require('./update-shows');
const reserved={name:'NOMBRE NO PUBLICO',city:'CIUDAD PRIVADA',venue:'SALA PRIVADA',url:'https://example.invalid/privado',date:'2026-11-22',estado:'Sin Finalizar',categories:['🎧 DJ']};
assert.deepEqual(buildOccupiedDates([reserved,reserved],'2026-10-25'),['2026-11-22']);
assert.deepEqual(buildOccupiedDates([{...reserved,categories:['🎨 Diseño']},{...reserved,estado:'cancelado'},{...reserved,estado:'No e pinchado'},{...reserved,date:'2026-10-01'}],'2026-10-25'),[]);
assert(!JSON.stringify(buildOccupiedDates([reserved],'2026-10-25')).includes('PRIVAD'));
console.log('Reservas: solo fechas, deduplicadas, sin detalles ni tareas de diseño.');
