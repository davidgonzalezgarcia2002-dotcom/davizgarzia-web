const assert=require('node:assert/strict');
const {showType,buildShowsHTML,buildEventsJsonLd}=require('./update-shows');
const metadata=require('./show-metadata.json');
for(const url of Object.keys(metadata)){
 const show={name:'Festival confirmado',date:'2026-12-04',url,city:'Santander',venue:'CLIENTE QUE NO DEBE SALIR'};
 assert.equal(showType(show),'festival');
 assert.match(buildShowsHTML([show]),/data-tipo="festival"/);
 assert.match(buildShowsHTML([show]),/Festival ·/);
 assert.ok(!buildShowsHTML([show]).includes('CLIENTE QUE NO DEBE SALIR'));
}
const forever={name:'Forever Millennial · edición Electrolatino',date:'2026-12-04',url:Object.keys(metadata)[2],city:'Santander'};
assert.match(buildShowsHTML([forever]),/Palacio de Deportes de Santander/);
assert.match(buildEventsJsonLd([forever]),/Palacio de Deportes de Santander/);
assert.equal(showType({name:'Sala Kaya'}),'club');
assert.equal(showType({name:'Cotillón Navidad La Lechera'}),'evento');
console.log('Festivales: tres clasificaciones, sala pública y cliente omitido.');
