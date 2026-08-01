const SNAPSHOT_DB_NAME = "atlas-karst-memory";
const SNAPSHOT_DB_STORE = "snapshots";
const SNAPSHOT_DB_KEY = "active";
function parseEmbeddedSnapshot(){
  try{
    const raw=document.getElementById("atlas-snapshot")?.textContent?.trim();
    if(!raw||raw==="{}")return null;
    const value=JSON.parse(raw);
    return value?.format==="atlas-karst-snapshot"?value:null;
  }catch(err){console.warn("Instantané embarqué illisible",err);return null}
}
const EMBEDDED_SNAPSHOT = parseEmbeddedSnapshot();

const HOUSE_ESTIMATE = {lat:45.5980539,lon:0.1471943}; // ancien repère de secours ; la V0.7 ajoute désormais une couche de repères patrimoniaux et anecdotiques
const LORE_KEY = "atlas-karst-lore-v07";
const CARTOFRICHES_KEY = "atlas-karst-cartofriches-v09h";
const HERITAGE_KEY = "atlas-karst-heritage-v010b";
const CULTURE_API_PORTALS = [
  "https://data.culture.gouv.fr",
  "https://data.culturecommunication.gouv.fr"
];
// Les portails Opendatasoft refusent fréquemment les appels depuis file://.
// L’API tabulaire officielle de data.gouv.fr expose les ressources CSV sous
// forme JSON, avec filtres et pagination, et constitue donc le chemin
// prioritaire pour une application autonome ouverte localement.
const DATAGOUV_TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources";
const CULTURE_TABULAR_RESOURCES = {
  monument:{rid:"3a52af4a-f9da-4dcc-8110-b07774dfb3bc",dataset:"liste-des-immeubles-proteges-au-titre-des-monuments-historiques"},
  garden:{rid:"49a648e5-ef47-41fe-aa18-9323a811c2c7",dataset:"liste-des-jardins-remarquables"},
  house:{rid:"bd705a3d-e13e-4388-a0a1-100ed47cc85f",dataset:"maisons-des-illustres"},
  museum:{rid:"5ccd6238-4fb0-4b2c-b14a-581909489320",dataset:"musees-de-france-base-museofile"}
};
const WIKIPEDIA_API = "https://fr.wikipedia.org/w/api.php";
const CULTURE_DATASETS = {
  monument:{
    id:"liste-des-immeubles-proteges-au-titre-des-monuments-historiques",
    label:"Monuments historiques",glyph:"MH",cls:"c-heritage-monument",
    geoHints:["coordonnees_au_format_wgs84","coordonnees_wgs84","coordonnees"]
  },
  garden:{
    id:"liste-des-jardins-remarquables",
    label:"Jardins remarquables",glyph:"JR",cls:"c-heritage-garden",
    geoHints:["coordonnees_geographiques","coordonnees","geolocalisation"],allowFullScan:true,fullScanCap:1500
  },
  house:{
    id:"maisons-des-illustres",
    label:"Maisons des Illustres",glyph:"MI",cls:"c-heritage-house",
    geoHints:["coordonnees_geographiques","coordonnees","geolocalisation"],allowFullScan:true,fullScanCap:1200
  },
  museum:{
    id:"liste-et-localisation-des-musees-de-france",fallbackId:"musees-de-france-base-museofile",
    label:"Musées de France",glyph:"MF",cls:"c-heritage-museum",
    geoHints:["coordonnees_finales","coordonnees_geographiques","geolocalisation","geo_point_2d"],allowFullScan:true,fullScanCap:3000
  }
};
const CARTOFRICHES_RESOURCE = "74feb3ed-5f9f-4ef8-8fab-b0128d569a99";
const CARTOFRICHES_API = `https://tabular-api.data.gouv.fr/api/resources/${CARTOFRICHES_RESOURCE}/data/`;
const CARTOFRICHES_DOWNLOAD = `https://www.data.gouv.fr/api/1/datasets/r/${CARTOFRICHES_RESOURCE}`;
const BSS_LOCAL_KEY = "atlas-karst-bss-v09n";
const BSS_DOWNLOAD_URL = "https://infoterre.brgm.fr/formulaire/telechargement-banque-sol-bss-departement";
const HUBEAU_PIEZO_URL = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations";
const BSS_EMBEDDED_LOCAL = [{"id":"BSS001UBMB","indice":"07091X0011","name":"F3P3","designation":"F3P3","commune":"LINARS","place":"MAS-DES-BOIS","lat":45.6428444,"lon":0.0756871,"depth":5.0,"altitude":25.58,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0011/F3P3\" ;\"07091X0011\")","embedded":true,"imported":true},{"id":"BSS001UBMF","indice":"07091X0015","name":"C","designation":"C","commune":"LINARS","place":"MAS DE BOIS","lat":45.6426107,"lon":0.0750185,"depth":4.0,"altitude":26.0,"nature":"AFFLEUREMENT-EAU","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0015/C\" ;\"07091X0015\")","embedded":true,"imported":true},{"id":"BSS001UBMH","indice":"07091X0017","name":"C3T2","designation":"C3T2","commune":"TROIS PALIS","place":"","lat":45.6412618,"lon":0.06647,"depth":2.7,"altitude":27.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0017/C3T2\" ;\"07091X0017\")","embedded":true,"imported":true},{"id":"BSS001UBML","indice":"07091X0020","name":"S82","designation":"S82","commune":"TROIS PALIS","place":"PRE RICHARD","lat":45.6409151,"lon":0.062506,"depth":2.0,"altitude":27.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0020/S82\" ;\"07091X0020\")","embedded":true,"imported":true},{"id":"BSS001UBMM","indice":"07091X0021","name":"S83","designation":"S83","commune":"NERSAC","place":"","lat":45.6379792,"lon":0.0687891,"depth":4.1,"altitude":26.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0021/S83\" ;\"07091X0021\")","embedded":true,"imported":true},{"id":"BSS001UBMN","indice":"07091X0022","name":"S84","designation":"S84","commune":"LINARS","place":"MAS-DES-BOIS","lat":45.6411746,"lon":0.0755826,"depth":6.0,"altitude":26.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0022/S84\" ;\"07091X0022\")","embedded":true,"imported":true},{"id":"BSS001UBMP","indice":"07091X0023","name":"S85","designation":"S85","commune":"NERSAC","place":"Z-I","lat":45.6324351,"lon":0.0659358,"depth":4.1,"altitude":42.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0023/S85\" ;\"07091X0023\")","embedded":true,"imported":true},{"id":"BSS001UBMQ","indice":"07091X0024","name":"S86","designation":"S86","commune":"NERSAC","place":"BOIS BEDEUIL - LA MARONNIERE","lat":45.6345603,"lon":0.0776531,"depth":5.2,"altitude":61.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0024/S86\" ;\"07091X0024\")","embedded":true,"imported":true},{"id":"BSS001UBMW","indice":"07091X0030","name":"P","designation":"P","commune":"NERSAC","place":"LE FLEURANCEAU","lat":45.6344542,"lon":0.0635424,"depth":12.5,"altitude":35.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0030/P\" ;\"07091X0030\")","embedded":true,"imported":true},{"id":"BSS001UBMX","indice":"07091X0031","name":"P","designation":"P","commune":"NERSAC","place":"BOIS BEDEUIL","lat":45.6361497,"lon":0.0760535,"depth":4.7,"altitude":59.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0031/P\" ;\"07091X0031\")","embedded":true,"imported":true},{"id":"BSS001UBMY","indice":"07091X0032","name":"P","designation":"P","commune":"NERSAC","place":"CHÂTEAU DE FLEURAC","lat":45.6400959,"lon":0.0843619,"depth":12.1,"altitude":56.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0032/P\" ;\"07091X0032\")","embedded":true,"imported":true},{"id":"BSS001UBNZ","indice":"07091X0057","name":"S","designation":"S","commune":"NERSAC","place":"ANCIEN SITE SOPPEC (S3)","lat":45.6310337,"lon":0.0636853,"depth":4.7,"altitude":40.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0057/S\" ;\"07091X0057\")","embedded":true,"imported":true},{"id":"BSS001UBPA","indice":"07091X0058","name":"PIEZO","designation":"PIEZO","commune":"NERSAC","place":"ANCIEN SITE SOPPEC (PZ4)","lat":45.6309225,"lon":0.0642563,"depth":21.0,"altitude":41.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0058/PIEZO\" ;\"07091X0058\")","embedded":true,"imported":true},{"id":"BSS001UBPB","indice":"07091X0059","name":"ECLUSE","designation":"ECLUSE","commune":"NERSAC","place":"ECLUSE DE LA MOTHE","lat":45.6379657,"lon":0.059297,"depth":null,"altitude":24.0,"nature":"ouvrage BSS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0059/ECLUSE\" ;\"07091X0059\")","embedded":true,"imported":true},{"id":"BSS001UBPC","indice":"07091X0060","name":"F","designation":"F","commune":"NERSAC","place":"NERSAC ZONE INDUSTRIELLE","lat":45.6336947,"lon":0.0731262,"depth":25.0,"altitude":45.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0060/F\" ;\"07091X0060\")","embedded":true,"imported":true},{"id":"BSS001UBQC","indice":"07091X0084","name":"S","designation":"S","commune":"NERSAC","place":"LE FLREURANCEAU","lat":45.6355523,"lon":0.0607354,"depth":null,"altitude":26.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0084/S\" ;\"07091X0084\")","embedded":true,"imported":true},{"id":"BSS001UBQD","indice":"07091X0085","name":"S","designation":"S","commune":"NERSAC","place":"BOIS BEDEUIL","lat":45.6393666,"lon":0.0753569,"depth":null,"altitude":25.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0085/S\" ;\"07091X0085\")","embedded":true,"imported":true},{"id":"BSS001UBQE","indice":"07091X0086","name":"S","designation":"S","commune":"NERSAC","place":"BOIS BEDEUIL","lat":45.6394725,"lon":0.0770084,"depth":null,"altitude":26.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0086/S\" ;\"07091X0086\")","embedded":true,"imported":true},{"id":"BSS001UBQP","indice":"07091X0095","name":"P","designation":"P","commune":"NERSAC","place":"MALADRERIE","lat":45.6287394,"lon":0.071423,"depth":null,"altitude":55.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0095/P\" ;\"07091X0095\")","embedded":true,"imported":true},{"id":"BSS001UBQU","indice":"07091X0100","name":"PZ","designation":"PZ","commune":"LINARS","place":"","lat":45.6418917,"lon":0.0702391,"depth":10.0,"altitude":30.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0100/PZ\" ;\"07091X0100\")","embedded":true,"imported":true},{"id":"BSS001UBQV","indice":"07091X0101","name":"PZ","designation":"PZ","commune":"NERSAC","place":"","lat":45.6271513,"lon":0.0706465,"depth":30.0,"altitude":66.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07091X0101/PZ\" ;\"07091X0101\")","embedded":true,"imported":true},{"id":"BSS001UBRA","indice":"07092X0002","name":"S","designation":"S","commune":"ANGOULEME","place":"POUDRERIE NATIONALE","lat":45.6384841,"lon":0.1299708,"depth":11.0,"altitude":31.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0002/S\" ;\"07092X0002\")","embedded":true,"imported":true},{"id":"BSS001UBRG","indice":"07092X0008","name":"F","designation":"F","commune":"ANGOULEME","place":"GRELET - USINE DE GELATINE","lat":45.6418343,"lon":0.1263672,"depth":20.2,"altitude":40.2,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0008/F\" ;\"07092X0008\")","embedded":true,"imported":true},{"id":"BSS001UBRJ","indice":"07092X0010","name":"F","designation":"F","commune":"ANGOULEME","place":"LA PETITE GARENNE","lat":45.6358983,"lon":0.14521,"depth":67.0,"altitude":108.5,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0010/F\" ;\"07092X0010\")","embedded":true,"imported":true},{"id":"BSS001UBRU","indice":"07092X0020","name":"S","designation":"S","commune":"ANGOULEME","place":"RUE DE LA LOIRE 139","lat":45.6417009,"lon":0.1655155,"depth":4.25,"altitude":47.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0020/S\" ;\"07092X0020\")","embedded":true,"imported":true},{"id":"BSS001UBSE","indice":"07092X0030","name":"C","designation":"C","commune":"COURONNE","place":"LA GARENNE","lat":45.6308488,"lon":0.0947385,"depth":7.5,"altitude":60.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0030/C\" ;\"07092X0030\")","embedded":true,"imported":true},{"id":"BSS001UBSQ","indice":"07092X0040","name":"P","designation":"P","commune":"COURONNE","place":"LA FORÊT","lat":45.6360808,"lon":0.0956585,"depth":3.1,"altitude":62.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0040/P\" ;\"07092X0040\")","embedded":true,"imported":true},{"id":"BSS001UBTH","indice":"07092X0057","name":"P","designation":"P","commune":"SAINT MICHEL","place":"","lat":45.6389541,"lon":0.1036518,"depth":null,"altitude":32.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0057/P\" ;\"07092X0057\")","embedded":true,"imported":true},{"id":"BSS001UBTJ","indice":"07092X0058","name":"P","designation":"P","commune":"SAINT MICHEL","place":"","lat":45.6409905,"lon":0.101901,"depth":null,"altitude":34.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0058/P\" ;\"07092X0058\")","embedded":true,"imported":true},{"id":"BSS001UBTK","indice":"07092X0059","name":"P","designation":"P","commune":"COURONNE","place":"","lat":45.6369704,"lon":0.1036015,"depth":null,"altitude":36.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0059/P\" ;\"07092X0059\")","embedded":true,"imported":true},{"id":"BSS001UBTL","indice":"07092X0060","name":"P","designation":"P","commune":"COURONNE","place":"","lat":45.6345961,"lon":0.1020302,"depth":null,"altitude":48.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0060/P\" ;\"07092X0060\")","embedded":true,"imported":true},{"id":"BSS001UBTM","indice":"07092X0061","name":"741","designation":"741","commune":"ANGOULEME","place":"PETIT FRISQUET","lat":45.6349759,"lon":0.1671827,"depth":34.0,"altitude":59.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0061/741\" ;\"07092X0061\")","embedded":true,"imported":true},{"id":"BSS001UBTQ","indice":"07092X0064","name":"Lac Noir","designation":"1","commune":"COURONNE","place":"LA FORET DES MOINES F1","lat":45.6332619,"lon":0.0936228,"depth":10.0,"altitude":56.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0064/1\" ;\"07092X0064\")","embedded":true,"imported":true},{"id":"BSS001UBTR","indice":"07092X0065","name":"Lac Noir","designation":"2","commune":"COURONNE","place":"LA FORET DES MOINES F2","lat":45.6324314,"lon":0.0911233,"depth":11.0,"altitude":59.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0065/2\" ;\"07092X0065\")","embedded":true,"imported":true},{"id":"BSS001UBTT","indice":"07092X0067","name":"S","designation":"S","commune":"COURONNE","place":"USINE DE BROYAGE DE DECHETS MENAGERS DU S I G ANGOULEME","lat":45.6316328,"lon":0.0975358,"depth":95.0,"altitude":56.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0067/S\" ;\"07092X0067\")","embedded":true,"imported":true},{"id":"BSS001UBTU","indice":"07092X0068","name":"68","designation":"68","commune":"COURONNE","place":"STATION DE POMPAGE DE L'OISELLERIE","lat":45.630681,"lon":0.1088624,"depth":3.0,"altitude":34.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0068/68\" ;\"07092X0068\")","embedded":true,"imported":true},{"id":"BSS001UBTW","indice":"07092X0070","name":"P","designation":"P","commune":"COURONNE","place":"","lat":45.6311309,"lon":0.1088389,"depth":null,"altitude":36.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0070/P\" ;\"07092X0070\")","embedded":true,"imported":true},{"id":"BSS001UBUA","indice":"07092X0075","name":"S","designation":"S","commune":"ANGOULEME","place":"PRAIRIE DE L'HIRONDELLE - GOLF DE L'HIRONDELLE","lat":45.6362681,"lon":0.1409651,"depth":78.0,"altitude":103.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0075/S\" ;\"07092X0075\")","embedded":true,"imported":true},{"id":"BSS001UBUB","indice":"07092X0076","name":"F","designation":"F","commune":"ANGOULEME","place":"PRAIRIE DE L'HIRONDELLE","lat":45.6392151,"lon":0.1395669,"depth":61.0,"altitude":71.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0076/F\" ;\"07092X0076\")","embedded":true,"imported":true},{"id":"BSS001UBUD","indice":"07092X0084","name":"PZ1","designation":"PZ1","commune":"ANGOULEME","place":"ZI DE RABION","lat":45.6374211,"lon":0.1310406,"depth":9.0,"altitude":47.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0084/PZ1\" ;\"07092X0084\")","embedded":true,"imported":true},{"id":"BSS001UBUE","indice":"07092X0085","name":"PZ2","designation":"PZ2","commune":"ANGOULEME","place":"ZI DE RABION","lat":45.6376175,"lon":0.1316727,"depth":9.0,"altitude":47.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0085/PZ2\" ;\"07092X0085\")","embedded":true,"imported":true},{"id":"BSS001UBUF","indice":"07092X0086","name":"PZ3","designation":"PZ3","commune":"ANGOULEME","place":"ZI DE RABION","lat":45.6389079,"lon":0.1331601,"depth":9.0,"altitude":47.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0086/PZ3\" ;\"07092X0086\")","embedded":true,"imported":true},{"id":"BSS001UBUJ","indice":"07092X0089","name":"ROUSSELOT  SAS","designation":"PZ2","commune":"ANGOULEME","place":"ANGOULEME","lat":45.6415993,"lon":0.1189416,"depth":14.5,"altitude":42.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0089/PZ2\" ;\"07092X0089\")","embedded":true,"imported":true},{"id":"BSS001UBUZ","indice":"07092X0104","name":"P1","designation":"P1","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6399861,"lon":0.1337466,"depth":10.0,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0104/P1\" ;\"07092X0104\")","embedded":true,"imported":true},{"id":"BSS001UBVA","indice":"07092X0105","name":"P2","designation":"P2","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6373058,"lon":0.1311108,"depth":44.0,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0105/P2\" ;\"07092X0105\")","embedded":true,"imported":true},{"id":"BSS001UBVB","indice":"07092X0106","name":"P3","designation":"P3","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6370926,"lon":0.1315843,"depth":47.0,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0106/P3\" ;\"07092X0106\")","embedded":true,"imported":true},{"id":"BSS001UBVC","indice":"07092X0107","name":"PZ4","designation":"PZ4","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6401029,"lon":0.1333808,"depth":9.0,"altitude":50.78,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0107/PZ4\" ;\"07092X0107\")","embedded":true,"imported":true},{"id":"BSS001UBVD","indice":"07092X0108","name":"PZ5","designation":"PZ5","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.636991,"lon":0.1314868,"depth":12.0,"altitude":49.92,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0108/PZ5\" ;\"07092X0108\")","embedded":true,"imported":true},{"id":"BSS001UBVE","indice":"07092X0109","name":"PZ6","designation":"PZ6","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.638402,"lon":0.1331092,"depth":12.0,"altitude":52.37,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0109/PZ6\" ;\"07092X0109\")","embedded":true,"imported":true},{"id":"BSS001UBVF","indice":"07092X0110","name":"PZ7","designation":"PZ7","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6370531,"lon":0.1318047,"depth":11.5,"altitude":49.76,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0110/PZ7\" ;\"07092X0110\")","embedded":true,"imported":true},{"id":"BSS001UBVG","indice":"07092X0111","name":"PZ8","designation":"PZ8","commune":"ANGOULEME","place":"RI RABION RUE BRIGADE RAC","lat":45.6372938,"lon":0.1309958,"depth":7.0,"altitude":48.08,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0111/PZ8\" ;\"07092X0111\")","embedded":true,"imported":true},{"id":"BSS001UBVH","indice":"07092X0112","name":"PZ9","designation":"PZ9","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6378734,"lon":0.1304006,"depth":7.0,"altitude":47.3,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0112/PZ9\" ;\"07092X0112\")","embedded":true,"imported":true},{"id":"BSS001UBVJ","indice":"07092X0113","name":"PZ10","designation":"PZ10","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6395991,"lon":0.1337666,"depth":7.5,"altitude":49.2,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0113/PZ10\" ;\"07092X0113\")","embedded":true,"imported":true},{"id":"BSS001UBVK","indice":"07092X0114","name":"PZ11","designation":"PZ11","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6387969,"lon":0.1330503,"depth":7.5,"altitude":48.21,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0114/PZ11\" ;\"07092X0114\")","embedded":true,"imported":true},{"id":"BSS001UBVL","indice":"07092X0115","name":"PZ12","designation":"PZ12","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6389596,"lon":0.1330675,"depth":10.5,"altitude":48.26,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0115/PZ12\" ;\"07092X0115\")","embedded":true,"imported":true},{"id":"BSS001UBVM","indice":"07092X0116","name":"PZ13","designation":"PZ13","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6392066,"lon":0.1328621,"depth":7.5,"altitude":48.28,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0116/PZ13\" ;\"07092X0116\")","embedded":true,"imported":true},{"id":"BSS001UBVN","indice":"07092X0117","name":"PZ14","designation":"PZ14","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6390083,"lon":0.1328595,"depth":8.5,"altitude":48.28,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0117/PZ14\" ;\"07092X0117\")","embedded":true,"imported":true},{"id":"BSS001UBVP","indice":"07092X0118","name":"PZ15","designation":"PZ15","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6393822,"lon":0.1323263,"depth":9.0,"altitude":49.84,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0118/PZ15\" ;\"07092X0118\")","embedded":true,"imported":true},{"id":"BSS001UBVQ","indice":"07092X0119","name":"PZ17","designation":"PZ17","commune":"ANGOULEME","place":"ZI RABION BRIGADE RAC","lat":45.6386944,"lon":0.1322078,"depth":null,"altitude":50.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0119/PZ17\" ;\"07092X0119\")","embedded":true,"imported":true},{"id":"BSS001UBVR","indice":"07092X0120","name":"PZ18","designation":"PZ18","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.638676,"lon":0.1329024,"depth":null,"altitude":50.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0120/PZ18\" ;\"07092X0120\")","embedded":true,"imported":true},{"id":"BSS001UBVS","indice":"07092X0121","name":"PZ19","designation":"PZ19","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6373344,"lon":0.13188,"depth":13.0,"altitude":50.08,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0121/PZ19\" ;\"07092X0121\")","embedded":true,"imported":true},{"id":"BSS001UBVT","indice":"07092X0122","name":"PZ20","designation":"PZ20","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6377464,"lon":0.1317816,"depth":10.0,"altitude":48.27,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0122/PZ20\" ;\"07092X0122\")","embedded":true,"imported":true},{"id":"BSS001UBVU","indice":"07092X0123","name":"PZ21","designation":"PZ21","commune":"ANGOULEME","place":"RI RABION RUE BRIGADE RAC","lat":45.6381813,"lon":0.1325812,"depth":11.5,"altitude":51.28,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0123/PZ21\" ;\"07092X0123\")","embedded":true,"imported":true},{"id":"BSS001UBVV","indice":"07092X0124","name":"PZ22","designation":"PZ22","commune":"ANGOULEME","place":"ZI RABION RUE BRIGADE RAC","lat":45.6365248,"lon":0.1312283,"depth":11.5,"altitude":48.82,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0124/PZ22\" ;\"07092X0124\")","embedded":true,"imported":true},{"id":"BSS001UBVW","indice":"07092X0125","name":"ROUSSELOT  SAS","designation":"P","commune":"ANGOULEME","place":"RUE DE SAINT MICHEL","lat":45.6404797,"lon":0.1192054,"depth":null,"altitude":30.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0125/P\" ;\"07092X0125\")","embedded":true,"imported":true},{"id":"BSS001UBXB","indice":"07092X0154","name":"F","designation":"F","commune":"SAINT MICHEL","place":"SAINT-MICHEL - RUE DES TULIPES","lat":45.6399248,"lon":0.1091632,"depth":null,"altitude":53.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0154/F\" ;\"07092X0154\")","embedded":true,"imported":true},{"id":"BSS001UBXC","indice":"07092X0155","name":"P","designation":"P","commune":"SAINT MICHEL","place":"BOURG","lat":45.6413822,"lon":0.1104745,"depth":12.7,"altitude":47.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0155/P\" ;\"07092X0155\")","embedded":true,"imported":true},{"id":"BSS001UBXD","indice":"07092X0156","name":"P","designation":"P","commune":"SAINT MICHEL","place":"LA SOUTERRAINE","lat":45.6377996,"lon":0.115183,"depth":null,"altitude":35.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0156/P\" ;\"07092X0156\")","embedded":true,"imported":true},{"id":"BSS001UBXJ","indice":"07092X0161","name":"S","designation":"S","commune":"ANGOULEME","place":"LES ALLIERS","lat":45.6379524,"lon":0.1274935,"depth":null,"altitude":45.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0161/S\" ;\"07092X0161\")","embedded":true,"imported":true},{"id":"BSS001UBXK","indice":"07092X0162","name":"S","designation":"S","commune":"ANGOULEME","place":"PAPETERIE DE L'ESCALIER","lat":45.6336607,"lon":0.1295143,"depth":null,"altitude":42.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0162/S\" ;\"07092X0162\")","embedded":true,"imported":true},{"id":"BSS001UBXL","indice":"07092X0163","name":"S","designation":"S","commune":"ANGOULEME","place":"PAPETERIE DE L'ESCALIER","lat":45.632933,"lon":0.1299502,"depth":null,"altitude":43.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0163/S\" ;\"07092X0163\")","embedded":true,"imported":true},{"id":"BSS001UBXM","indice":"07092X0164","name":"S","designation":"S","commune":"ANGOULEME","place":"FONTGRAVE","lat":45.6394406,"lon":0.1659267,"depth":null,"altitude":49.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0164/S\" ;\"07092X0164\")","embedded":true,"imported":true},{"id":"BSS001UBXN","indice":"07092X0165","name":"S","designation":"S","commune":"ANGOULEME","place":"FONTGRAVE","lat":45.6393773,"lon":0.1662767,"depth":null,"altitude":49.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0165/S\" ;\"07092X0165\")","embedded":true,"imported":true},{"id":"BSS001UBXX","indice":"07092X0174","name":"F","designation":"F","commune":"COURONNE","place":"LA BROUSSE","lat":45.6286537,"lon":0.0931326,"depth":5.65,"altitude":59.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0174/F\" ;\"07092X0174\")","embedded":true,"imported":true},{"id":"BSS001UBXY","indice":"07092X0175","name":"F","designation":"F","commune":"COURONNE","place":"DECHETTERIE","lat":45.6317057,"lon":0.0944238,"depth":4.1,"altitude":60.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0175/F\" ;\"07092X0175\")","embedded":true,"imported":true},{"id":"BSS001UBXZ","indice":"07092X0176","name":"F","designation":"F","commune":"COURONNE","place":"DECHETTERIE","lat":45.6315882,"lon":0.0954574,"depth":10.0,"altitude":60.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0176/F\" ;\"07092X0176\")","embedded":true,"imported":true},{"id":"BSS001UBYA","indice":"07092X0177","name":"P","designation":"P","commune":"SAINT MICHEL","place":"PUIT AU VILLAGE","lat":45.6386924,"lon":0.1078403,"depth":17.3,"altitude":44.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0177/P\" ;\"07092X0177\")","embedded":true,"imported":true},{"id":"BSS001UBYB","indice":"07092X0178","name":"F","designation":"F","commune":"COURONNE","place":"","lat":45.6310006,"lon":0.1223828,"depth":32.0,"altitude":55.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0178/F\" ;\"07092X0178\")","embedded":true,"imported":true},{"id":"BSS001UBYJ","indice":"07092X0185","name":"C","designation":"C","commune":"ANGOULEME","place":"DEPOT D'AUTOBUS DE GIRAC","lat":45.6381405,"lon":0.1256854,"depth":null,"altitude":38.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0185/C\" ;\"07092X0185\")","embedded":true,"imported":true},{"id":"BSS001UBYK","indice":"07092X0186","name":"T","designation":"T","commune":"ANGOULEME","place":"DEPOT D'AUTOBUS DE GIRAC","lat":45.6378144,"lon":0.1259721,"depth":null,"altitude":39.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0186/T\" ;\"07092X0186\")","embedded":true,"imported":true},{"id":"BSS001UBYL","indice":"07092X0187","name":"PM","designation":"PM","commune":"ANGOULEME","place":"DEPOT D'AUTOBUS DE GIRAC","lat":45.6376192,"lon":0.1257382,"depth":null,"altitude":39.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0187/PM\" ;\"07092X0187\")","embedded":true,"imported":true},{"id":"BSS001UBYM","indice":"07092X0188","name":"P","designation":"P","commune":"ANGOULEME","place":"DEPOT D'AUTOBUS DE GIRAC","lat":45.6385693,"lon":0.1251879,"depth":null,"altitude":39.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07092X0188/P\" ;\"07092X0188\")","embedded":true,"imported":true},{"id":"BSS001UBYZ","indice":"07093X0008","name":"GL","designation":"GL","commune":"ANGOULEME","place":"JESUITES","lat":45.6312582,"lon":0.1795227,"depth":null,"altitude":70.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0008/GL\" ;\"07093X0008\")","embedded":true,"imported":true},{"id":"BSS001UBZB","indice":"07093X0010","name":"GL","designation":"GL","commune":"ANGOULEME","place":"CHEZ NERA","lat":45.6307,"lon":0.1831343,"depth":null,"altitude":75.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0010/GL\" ;\"07093X0010\")","embedded":true,"imported":true},{"id":"BSS001UBZE","indice":"07093X0013","name":"GL","designation":"GL","commune":"SOYAUX","place":"CAVERNES","lat":45.6342667,"lon":0.2287924,"depth":null,"altitude":144.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0013/GL\" ;\"07093X0013\")","embedded":true,"imported":true},{"id":"BSS001UBZY","indice":"07093X0031","name":"P","designation":"P","commune":"SOYAUX","place":"LA MAISON ROUGE","lat":45.6310161,"lon":0.2186551,"depth":13.0,"altitude":146.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0031/P\" ;\"07093X0031\")","embedded":true,"imported":true},{"id":"BSS001UBZZ","indice":"07093X0032","name":"P","designation":"P","commune":"SOYAUX","place":"MONTBOULARD","lat":45.6412498,"lon":0.2127459,"depth":17.0,"altitude":110.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0032/P\" ;\"07093X0032\")","embedded":true,"imported":true},{"id":"BSS001UCAA","indice":"07093X0033","name":"P","designation":"P","commune":"SOYAUX","place":"LES EFFAMIERS","lat":45.6355706,"lon":0.2071877,"depth":12.4,"altitude":132.5,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0033/P\" ;\"07093X0033\")","embedded":true,"imported":true},{"id":"BSS001UCBJ","indice":"07093X0065","name":"F","designation":"F","commune":"SOYAUX","place":"","lat":45.6385261,"lon":0.2111875,"depth":140.0,"altitude":124.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07093X0065/F\" ;\"07093X0065\")","embedded":true,"imported":true},{"id":"BSS001UCET","indice":"07095X0001","name":"TX","designation":"TX","commune":"COURONNE","place":"PAPETERIE DE L'ABBAYE - PONT","lat":45.6086113,"lon":0.0853899,"depth":13.5,"altitude":43.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0001/TX\" ;\"07095X0001\")","embedded":true,"imported":true},{"id":"BSS001UCFT","indice":"07095X0025","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"CLERIGNAC","lat":45.5612566,"lon":0.0669446,"depth":28.0,"altitude":138.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0025/P\" ;\"07095X0025\")","embedded":true,"imported":true},{"id":"BSS001UCFW","indice":"07095X0029","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LES PLANTES","lat":45.5754647,"lon":0.0748152,"depth":4.0,"altitude":73.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0029/P\" ;\"07095X0029\")","embedded":true,"imported":true},{"id":"BSS001UCFX","indice":"07095X0030","name":"P","designation":"P","commune":"COURONNE","place":"CHEZ BARRET","lat":45.6115576,"lon":0.0839895,"depth":5.1,"altitude":44.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0030/P\" ;\"07095X0030\")","embedded":true,"imported":true},{"id":"BSS001UCFY","indice":"07095X0031","name":"P","designation":"P","commune":"COURONNE","place":"CHEZ DION","lat":45.6102083,"lon":0.0750604,"depth":16.2,"altitude":60.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0031/P\" ;\"07095X0031\")","embedded":true,"imported":true},{"id":"BSS001UCFZ","indice":"07095X0032","name":"P","designation":"P","commune":"COURONNE","place":"LA FONT","lat":45.6128402,"lon":0.0716217,"depth":9.1,"altitude":55.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0032/P\" ;\"07095X0032\")","embedded":true,"imported":true},{"id":"BSS001UCGA","indice":"07095X0033","name":"P","designation":"P","commune":"COURONNE","place":"L'ENSOLEILLÉE","lat":45.6144583,"lon":0.0673246,"depth":10.7,"altitude":63.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0033/P\" ;\"07095X0033\")","embedded":true,"imported":true},{"id":"BSS001UCGB","indice":"07095X0034","name":"P","designation":"P","commune":"NERSAC","place":"POMBRETON","lat":45.6158674,"lon":0.0612407,"depth":9.0,"altitude":54.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0034/P\" ;\"07095X0034\")","embedded":true,"imported":true},{"id":"BSS001UCGD","indice":"07095X0036","name":"P","designation":"P","commune":"NERSAC","place":"LE PEU","lat":45.6258874,"lon":0.0581276,"depth":9.3,"altitude":60.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0036/P\" ;\"07095X0036\")","embedded":true,"imported":true},{"id":"BSS001UCGE","indice":"07095X0037","name":"P","designation":"P","commune":"COURONNE","place":"LE GRAND MAINE","lat":45.6240102,"lon":0.0766816,"depth":11.0,"altitude":73.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0037/P\" ;\"07095X0037\")","embedded":true,"imported":true},{"id":"BSS001UCGG","indice":"07095X0039","name":"P","designation":"P","commune":"NERSAC","place":"LES FONTENELLES","lat":45.6226092,"lon":0.0654418,"depth":4.2,"altitude":41.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0039/P\" ;\"07095X0039\")","embedded":true,"imported":true},{"id":"BSS001UCGL","indice":"07095X0043","name":"P","designation":"P","commune":"NERSAC","place":"CHEZ ROBIN","lat":45.6081807,"lon":0.0595044,"depth":3.8,"altitude":60.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0043/P\" ;\"07095X0043\")","embedded":true,"imported":true},{"id":"BSS001UCGM","indice":"07095X0044","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LES AUBREAUX","lat":45.6045538,"lon":0.0804298,"depth":12.3,"altitude":58.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0044/P\" ;\"07095X0044\")","embedded":true,"imported":true},{"id":"BSS001UCGN","indice":"07095X0045","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LES GIRARDS","lat":45.589746,"lon":0.0602645,"depth":3.7,"altitude":58.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0045/P\" ;\"07095X0045\")","embedded":true,"imported":true},{"id":"BSS001UCGP","indice":"07095X0046","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LA RABERIE","lat":45.5926981,"lon":0.0770628,"depth":7.1,"altitude":60.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0046/P\" ;\"07095X0046\")","embedded":true,"imported":true},{"id":"BSS001UCGQ","indice":"07095X0047","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LA CROIX DE BEAUMONT","lat":45.5940055,"lon":0.0618867,"depth":5.9,"altitude":62.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0047/P\" ;\"07095X0047\")","embedded":true,"imported":true},{"id":"BSS001UCHS","indice":"07095X0077","name":"P","designation":"P","commune":"CLAIX","place":"LES BAUDRIES","lat":45.5685486,"lon":0.0580657,"depth":28.0,"altitude":95.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0077/P\" ;\"07095X0077\")","embedded":true,"imported":true},{"id":"BSS001UCHT","indice":"07095X0083","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"CHEZ GRENET","lat":45.5675557,"lon":0.0846234,"depth":null,"altitude":70.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0083/P\" ;\"07095X0083\")","embedded":true,"imported":true},{"id":"BSS001UCHU","indice":"07095X0085","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LAUDRIE","lat":45.57021,"lon":0.0688829,"depth":30.0,"altitude":95.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0085/P\" ;\"07095X0085\")","embedded":true,"imported":true},{"id":"BSS001UCHW","indice":"07095X0088","name":"TX","designation":"TX","commune":"NERSAC","place":"POMBRETON (LA CORNERIE) (CHAMP DES MARQUES)","lat":45.6161894,"lon":0.0594259,"depth":11.0,"altitude":60.0,"nature":"TRAVAUX-SOUTERRAINS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0088/TX\" ;\"07095X0088\")","embedded":true,"imported":true},{"id":"BSS001UCJF","indice":"07095X0097","name":"C","designation":"C","commune":"NERSAC","place":"CHAMP DES MARQUES (77)","lat":45.6152026,"lon":0.0595939,"depth":null,"altitude":60.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0097/C\" ;\"07095X0097\")","embedded":true,"imported":true},{"id":"BSS001UCJG","indice":"07095X0098","name":"C","designation":"C","commune":"ROULLET SAINT ESTEPHE","place":"BOIS DES AUTURS (98)","lat":45.5600949,"lon":0.0759596,"depth":null,"altitude":130.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0098/C\" ;\"07095X0098\")","embedded":true,"imported":true},{"id":"BSS001UCJH","indice":"07095X0099","name":"C","designation":"C","commune":"ROULLET SAINT ESTEPHE","place":"BOIS DES AUTURS (99)","lat":45.5600949,"lon":0.0759596,"depth":null,"altitude":130.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0099/C\" ;\"07095X0099\")","embedded":true,"imported":true},{"id":"BSS001UCJK","indice":"07095X0101","name":"C","designation":"C","commune":"ROULLET SAINT ESTEPHE","place":"LE PATIS (143)","lat":45.6082563,"lon":0.0675759,"depth":null,"altitude":72.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0101/C\" ;\"07095X0101\")","embedded":true,"imported":true},{"id":"BSS001UCJN","indice":"07095X0104","name":"C","designation":"C","commune":"NERSAC","place":"CHEZ ROBIN (137)","lat":45.6081461,"lon":0.0578372,"depth":null,"altitude":60.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0104/C\" ;\"07095X0104\")","embedded":true,"imported":true},{"id":"BSS001UCJS","indice":"07095X0108","name":"F","designation":"F","commune":"ROULLET SAINT ESTEPHE","place":"LES MOREAUX","lat":45.5760403,"lon":0.0768506,"depth":10.0,"altitude":62.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0108/F\" ;\"07095X0108\")","embedded":true,"imported":true},{"id":"BSS001UCKE","indice":"07095X0121","name":"F","designation":"F","commune":"ROULLET SAINT ESTEPHE","place":"LE PETIT VIGNAC","lat":45.575224,"lon":0.0586866,"depth":30.0,"altitude":68.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0121/F\" ;\"07095X0121\")","embedded":true,"imported":true},{"id":"BSS001UCKJ","indice":"07095X0125","name":"F","designation":"F","commune":"ROULLET SAINT ESTEPHE","place":"LES COMBES A GUILLOT","lat":45.598701,"lon":0.0719325,"depth":27.0,"altitude":61.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0125/F\" ;\"07095X0125\")","embedded":true,"imported":true},{"id":"BSS001UCKK","indice":"07095X0126","name":"F","designation":"F","commune":"COURONNE","place":"14 ROUTE DE LA VERGNE","lat":45.6035696,"lon":0.0820864,"depth":16.0,"altitude":49.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0126/F\" ;\"07095X0126\")","embedded":true,"imported":true},{"id":"BSS001UCKN","indice":"07095X0129","name":"R","designation":"R","commune":"NERSAC","place":"POMBRETON","lat":45.6164334,"lon":0.0618655,"depth":null,"altitude":42.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0129/R\" ;\"07095X0129\")","embedded":true,"imported":true},{"id":"BSS001UCKP","indice":"07095X0130","name":"P","designation":"P","commune":"NERSAC","place":"POMBRETON","lat":45.61646,"lon":0.0615046,"depth":9.0,"altitude":48.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0130/P\" ;\"07095X0130\")","embedded":true,"imported":true},{"id":"BSS001UCKQ","indice":"07095X0131","name":"F","designation":"F","commune":"NERSAC","place":"POMBRETON","lat":45.6163257,"lon":0.0611907,"depth":27.6,"altitude":51.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0131/F\" ;\"07095X0131\")","embedded":true,"imported":true},{"id":"BSS001UCKR","indice":"07095X0132","name":"F","designation":"F","commune":"NERSAC","place":"POMBRETON","lat":45.6163,"lon":0.0612434,"depth":10.3,"altitude":51.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0132/F\" ;\"07095X0132\")","embedded":true,"imported":true},{"id":"BSS001UCKS","indice":"07095X0133","name":"F","designation":"F","commune":"NERSAC","place":"POMBRETON","lat":45.616203,"lon":0.0609789,"depth":8.4,"altitude":54.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0133/F\" ;\"07095X0133\")","embedded":true,"imported":true},{"id":"BSS001UCKT","indice":"07095X0134","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"LES AUBREAUX","lat":45.6048374,"lon":0.0805946,"depth":null,"altitude":57.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0134/P\" ;\"07095X0134\")","embedded":true,"imported":true},{"id":"BSS001UCKU","indice":"07095X0135","name":"P","designation":"P","commune":"ROULLET SAINT ESTEPHE","place":"FONTAINES","lat":45.5963385,"lon":0.0621995,"depth":null,"altitude":57.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0135/P\" ;\"07095X0135\")","embedded":true,"imported":true},{"id":"BSS001UCLY","indice":"07095X0163","name":"S","designation":"S","commune":"NERSAC","place":"LE PATIS","lat":45.6024442,"lon":0.0592954,"depth":null,"altitude":45.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0163/S\" ;\"07095X0163\")","embedded":true,"imported":true},{"id":"BSS001UCLZ","indice":"07095X0164","name":"S","designation":"S","commune":"NERSAC","place":"CHEZ ROBIN","lat":45.6077066,"lon":0.0606722,"depth":null,"altitude":56.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0164/S\" ;\"07095X0164\")","embedded":true,"imported":true},{"id":"BSS001UCMA","indice":"07095X0165","name":"S","designation":"S","commune":"NERSAC","place":"POMBRETON","lat":45.6166021,"lon":0.0621134,"depth":null,"altitude":43.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0165/S\" ;\"07095X0165\")","embedded":true,"imported":true},{"id":"BSS001UCMB","indice":"07095X0166","name":"S","designation":"S","commune":"NERSAC","place":"LES FONTENELLES","lat":45.6221896,"lon":0.062138,"depth":null,"altitude":39.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0166/S\" ;\"07095X0166\")","embedded":true,"imported":true},{"id":"BSS001UCMC","indice":"07095X0167","name":"S","designation":"S","commune":"NERSAC","place":"LES FONTENELLES","lat":45.6209839,"lon":0.0666965,"depth":null,"altitude":37.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0167/S\" ;\"07095X0167\")","embedded":true,"imported":true},{"id":"BSS001UCMD","indice":"07095X0168","name":"S","designation":"S","commune":"NERSAC","place":"LE PEU","lat":45.6276434,"lon":0.0649824,"depth":null,"altitude":55.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0168/S\" ;\"07095X0168\")","embedded":true,"imported":true},{"id":"BSS001UCME","indice":"07095X0169","name":"S","designation":"S","commune":"COURONNE","place":"LES COURTES","lat":45.6187222,"lon":0.0826364,"depth":null,"altitude":52.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0169/S\" ;\"07095X0169\")","embedded":true,"imported":true},{"id":"BSS001UCMF","indice":"07095X0170","name":"S","designation":"S","commune":"COURONNE","place":"LES COURTES","lat":45.6147873,"lon":0.0792741,"depth":null,"altitude":38.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0170/S\" ;\"07095X0170\")","embedded":true,"imported":true},{"id":"BSS001UCMH","indice":"07095X0172","name":"S","designation":"S","commune":"ROULLET SAINT ESTEPHE","place":"LES PRES DE LA LEVEE","lat":45.5903438,"lon":0.0776619,"depth":null,"altitude":54.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0172/S\" ;\"07095X0172\")","embedded":true,"imported":true},{"id":"BSS001UCMJ","indice":"07095X0173","name":"S","designation":"S","commune":"ROULLET SAINT ESTEPHE","place":"LES GIRARDS","lat":45.5886748,"lon":0.0599619,"depth":null,"altitude":58.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0173/S\" ;\"07095X0173\")","embedded":true,"imported":true},{"id":"BSS001UCML","indice":"07095X0175","name":"S","designation":"S","commune":"ROULLET SAINT ESTEPHE","place":"LA FONT BERTIN","lat":45.583545,"lon":0.071604,"depth":null,"altitude":60.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0175/S\" ;\"07095X0175\")","embedded":true,"imported":true},{"id":"BSS001UCNG","indice":"07095X0195","name":"P","designation":"P","commune":"COURONNE","place":"LA VIEILLE MONDONE","lat":45.6153807,"lon":0.0840836,"depth":4.43,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0195/P\" ;\"07095X0195\")","embedded":true,"imported":true},{"id":"BSS001UCNH","indice":"07095X0196","name":"P","designation":"P","commune":"NERSAC","place":"POMBRETON","lat":45.6171974,"lon":0.0604125,"depth":10.0,"altitude":55.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0196/P\" ;\"07095X0196\")","embedded":true,"imported":true},{"id":"BSS001UCNK","indice":"07095X0198","name":"PZ","designation":"PZ","commune":"NERSAC","place":"","lat":45.6236561,"lon":0.0699967,"depth":20.0,"altitude":69.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0198/PZ\" ;\"07095X0198\")","embedded":true,"imported":true},{"id":"BSS001UCNL","indice":"07095X0199","name":"PZ","designation":"PZ","commune":"NERSAC","place":"","lat":45.6205069,"lon":0.0694827,"depth":20.0,"altitude":50.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0199/PZ\" ;\"07095X0199\")","embedded":true,"imported":true},{"id":"BSS001UCNM","indice":"07095X0200","name":"PZ","designation":"PZ","commune":"COURONNE","place":"","lat":45.6138064,"lon":0.0675517,"depth":20.0,"altitude":63.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0200/PZ\" ;\"07095X0200\")","embedded":true,"imported":true},{"id":"BSS001UCNP","indice":"07095X0202","name":"PZ","designation":"PZ","commune":"COURONNE","place":"","lat":45.5889449,"lon":0.0869505,"depth":35.0,"altitude":54.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0202/PZ\" ;\"07095X0202\")","embedded":true,"imported":true},{"id":"BSS001UCNQ","indice":"07095X0203","name":"PZ","designation":"PZ","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5870322,"lon":0.0809551,"depth":15.0,"altitude":57.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07095X0203/PZ\" ;\"07095X0203\")","embedded":true,"imported":true},{"id":"BSS001UCNY","indice":"07096X0001","name":"F","designation":"F","commune":"COURONNE","place":"STE CIMENTS LAFARGE","lat":45.6145878,"lon":0.1050158,"depth":45.5,"altitude":50.3,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0001/F\" ;\"07096X0001\")","embedded":true,"imported":true},{"id":"BSS001UCNZ","indice":"07096X0002","name":"GL","designation":"GL","commune":"TORSAC","place":"CHAPUSE","lat":45.5808889,"lon":0.1716153,"depth":null,"altitude":102.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0002/GL\" ;\"07096X0002\")","embedded":true,"imported":true},{"id":"BSS001UCPA","indice":"07096X0003","name":"GL","designation":"GL","commune":"VOEUIL ET GIGET","place":"GIGET","lat":45.6035672,"lon":0.1622676,"depth":null,"altitude":80.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0003/GL\" ;\"07096X0003\")","embedded":true,"imported":true},{"id":"BSS001UCPB","indice":"07096X0004","name":"GL","designation":"GL","commune":"VOEUIL ET GIGET","place":"STERLING","lat":45.5891547,"lon":0.1432289,"depth":null,"altitude":80.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0004/GL\" ;\"07096X0004\")","embedded":true,"imported":true},{"id":"BSS001UCPC","indice":"07096X0005","name":"F","designation":"F","commune":"COURONNE","place":"LE ROCHU F.E.","lat":45.6118686,"lon":0.1085988,"depth":47.0,"altitude":47.72,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0005/F\" ;\"07096X0005\")","embedded":true,"imported":true},{"id":"BSS001UCPD","indice":"07096X0006","name":"F","designation":"F","commune":"COURONNE","place":"FONT ROY","lat":45.6150996,"lon":0.1217965,"depth":49.0,"altitude":48.85,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0006/F\" ;\"07096X0006\")","embedded":true,"imported":true},{"id":"BSS001UCPF","indice":"07096X0008","name":"GROTTE","designation":"GROTTE","commune":"COURONNE","place":"TROU DU RENARD","lat":45.5932079,"lon":0.1117802,"depth":null,"altitude":95.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0008/GROTTE\" ;\"07096X0008\")","embedded":true,"imported":true},{"id":"BSS001UCPG","indice":"07096X0009","name":"CN","designation":"CN","commune":"COURONNE","place":"","lat":45.5928479,"lon":0.1117989,"depth":null,"altitude":75.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0009/CN\" ;\"07096X0009\")","embedded":true,"imported":true},{"id":"BSS001UCPH","indice":"07096X0010","name":"GL","designation":"GL","commune":"VOEUIL ET GIGET","place":"LES COMBES","lat":45.6023764,"lon":0.1657816,"depth":null,"altitude":95.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0010/GL\" ;\"07096X0010\")","embedded":true,"imported":true},{"id":"BSS001UCPJ","indice":"07096X0011","name":"GL","designation":"GL","commune":"MOUTHIERS SUR BOEME","place":"VALLEE DU ROC","lat":45.5825623,"lon":0.1465586,"depth":null,"altitude":80.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0011/GL\" ;\"07096X0011\")","embedded":true,"imported":true},{"id":"BSS001UCPK","indice":"07096X0012","name":"GL","designation":"GL","commune":"MOUTHIERS SUR BOEME","place":"ANGLAIS","lat":45.5846096,"lon":0.1363539,"depth":null,"altitude":85.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0012/GL\" ;\"07096X0012\")","embedded":true,"imported":true},{"id":"BSS001UCPL","indice":"07096X0013","name":"GL","designation":"GL","commune":"PUYMOYEN","place":"CHATEAU DU DIABLE","lat":45.6153742,"lon":0.1584656,"depth":null,"altitude":90.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0013/GL\" ;\"07096X0013\")","embedded":true,"imported":true},{"id":"BSS001UCPM","indice":"07096X0014","name":"GL","designation":"GL","commune":"MOUTHIERS SUR BOEME","place":"BOULESTEC","lat":45.5830036,"lon":0.1465487,"depth":null,"altitude":80.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0014/GL\" ;\"07096X0014\")","embedded":true,"imported":true},{"id":"BSS001UCPN","indice":"07096X0015","name":"GL","designation":"GL","commune":"PUYMOYEN","place":"CLAIRGON","lat":45.6237176,"lon":0.1527467,"depth":null,"altitude":80.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0015/GL\" ;\"07096X0015\")","embedded":true,"imported":true},{"id":"BSS001UCPP","indice":"07096X0016","name":"GL","designation":"GL","commune":"PUYMOYEN","place":"MOULIN DU VERGER","lat":45.6098432,"lon":0.174977,"depth":null,"altitude":80.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0016/GL\" ;\"07096X0016\")","embedded":true,"imported":true},{"id":"BSS001UCPQ","indice":"07096X0017","name":"SOURCE","designation":"SOURCE","commune":"COURONNE","place":"FONTAINE DE FONT-ROI","lat":45.6154828,"lon":0.1226882,"depth":0.81,"altitude":50.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0017/SOURCE\" ;\"07096X0017\")","embedded":true,"imported":true},{"id":"BSS001UCPR","indice":"07096X0018","name":"FORAGE","designation":"FORAGE","commune":"COURONNE","place":"CIMENTERIE LAFARGE","lat":45.6129743,"lon":0.1053441,"depth":37.5,"altitude":50.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0018/FORAGE\" ;\"07096X0018\")","embedded":true,"imported":true},{"id":"BSS001UCPS","indice":"07096X0019","name":"AFFL","designation":"AFFL","commune":"COURONNE","place":"CHAUMES DE LA BERGERIE","lat":45.6126351,"lon":0.1065174,"depth":8.0,"altitude":49.75,"nature":"AFFLEUREMENT-EAU","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0019/AFFL\" ;\"07096X0019\")","embedded":true,"imported":true},{"id":"BSS001UCPT","indice":"07096X0020","name":"PONTY","designation":"PONTY","commune":"MOUTHIERS SUR BOEME","place":"LE PONTY","lat":45.5604109,"lon":0.088129,"depth":null,"altitude":75.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0020/PONTY\" ;\"07096X0020\")","embedded":true,"imported":true},{"id":"BSS001UCPV","indice":"07096X0022","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LE ROSIER","lat":45.5764949,"lon":0.1450105,"depth":67.0,"altitude":124.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0022/F\" ;\"07096X0022\")","embedded":true,"imported":true},{"id":"BSS001UCPW","indice":"07096X0023","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LA FOYE","lat":45.5645681,"lon":0.1380561,"depth":9.15,"altitude":120.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0023/P\" ;\"07096X0023\")","embedded":true,"imported":true},{"id":"BSS001UCPX","indice":"07096X0024","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LE CHARBONNIER","lat":45.5726826,"lon":0.1340063,"depth":12.2,"altitude":105.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0024/P\" ;\"07096X0024\")","embedded":true,"imported":true},{"id":"BSS001UCPY","indice":"07096X0025","name":"HY","designation":"HY","commune":"MOUTHIERS SUR BOEME","place":"LE ROC","lat":45.5735067,"lon":0.1348746,"depth":null,"altitude":79.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0025/HY\" ;\"07096X0025\")","embedded":true,"imported":true},{"id":"BSS001UCPZ","indice":"07096X0026","name":"P","designation":"P","commune":"COURONNE","place":"LA FOUILLOUSE","lat":45.5843361,"lon":0.1249341,"depth":23.8,"altitude":113.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0026/P\" ;\"07096X0026\")","embedded":true,"imported":true},{"id":"BSS001UCQA","indice":"07096X0027","name":"P","designation":"P","commune":"COURONNE","place":"LE GIRAUDEAU","lat":45.5895483,"lon":0.1360345,"depth":30.5,"altitude":100.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0027/P\" ;\"07096X0027\")","embedded":true,"imported":true},{"id":"BSS001UCQB","indice":"07096X0028","name":"P","designation":"P","commune":"VOEUIL ET GIGET","place":"LE STERLING","lat":45.5870339,"lon":0.1498447,"depth":2.4,"altitude":73.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0028/P\" ;\"07096X0028\")","embedded":true,"imported":true},{"id":"BSS001UCQC","indice":"07096X0029","name":"P","designation":"P","commune":"VOEUIL ET GIGET","place":"LES TURINS","lat":45.5908985,"lon":0.154433,"depth":49.0,"altitude":101.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0029/P\" ;\"07096X0029\")","embedded":true,"imported":true},{"id":"BSS001UCQD","indice":"07096X0030","name":"HY","designation":"HY","commune":"VOEUIL ET GIGET","place":"BOURG","lat":45.5848526,"lon":0.1580029,"depth":null,"altitude":80.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0030/HY\" ;\"07096X0030\")","embedded":true,"imported":true},{"id":"BSS001UCQE","indice":"07096X0031","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LE ROSIER","lat":45.5761447,"lon":0.1454135,"depth":9.0,"altitude":128.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0031/P\" ;\"07096X0031\")","embedded":true,"imported":true},{"id":"BSS001UCQF","indice":"07096X0032","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LE PUITS","lat":45.5750527,"lon":0.135077,"depth":5.4,"altitude":88.08,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0032/P\" ;\"07096X0032\")","embedded":true,"imported":true},{"id":"BSS001UCQG","indice":"07096X0033","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LA RIVIÈRE","lat":45.570099,"lon":0.1397591,"depth":28.2,"altitude":125.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0033/P\" ;\"07096X0033\")","embedded":true,"imported":true},{"id":"BSS001UCQH","indice":"07096X0034","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LA BUSSIÈRE","lat":45.5703293,"lon":0.1516657,"depth":16.0,"altitude":128.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0034/P\" ;\"07096X0034\")","embedded":true,"imported":true},{"id":"BSS001UCQJ","indice":"07096X0035","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LES ERABLEAUX","lat":45.5639636,"lon":0.1575472,"depth":15.0,"altitude":141.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0035/P\" ;\"07096X0035\")","embedded":true,"imported":true},{"id":"BSS001UCQK","indice":"07096X0036","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5639366,"lon":0.1607556,"depth":13.0,"altitude":135.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0036/P\" ;\"07096X0036\")","embedded":true,"imported":true},{"id":"BSS001UCQL","indice":"07096X0037","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LE GRAND GUÉRIN","lat":45.5662776,"lon":0.1610462,"depth":7.1,"altitude":130.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0037/P\" ;\"07096X0037\")","embedded":true,"imported":true},{"id":"BSS001UCQM","indice":"07096X0038","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.588984,"lon":0.1624625,"depth":4.5,"altitude":105.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0038/P\" ;\"07096X0038\")","embedded":true,"imported":true},{"id":"BSS001UCQN","indice":"07096X0039","name":"HY","designation":"HY","commune":"MOUTHIERS SUR BOEME","place":"FONTAINE DES BARRES","lat":45.5690949,"lon":0.1623516,"depth":null,"altitude":100.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0039/HY\" ;\"07096X0039\")","embedded":true,"imported":true},{"id":"BSS001UCQP","indice":"07096X0040","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"CHEZ FAYARD","lat":45.5643329,"lon":0.167534,"depth":17.0,"altitude":131.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0040/P\" ;\"07096X0040\")","embedded":true,"imported":true},{"id":"BSS001UCQT","indice":"07096X0044","name":"P","designation":"P","commune":"VOEUIL ET GIGET","place":"TIVOLI","lat":45.6033915,"lon":0.1531752,"depth":25.0,"altitude":102.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0044/P\" ;\"07096X0044\")","embedded":true,"imported":true},{"id":"BSS001UCQU","indice":"07096X0045","name":"HY","designation":"HY","commune":"VOEUIL ET GIGET","place":"USINE THOMAS","lat":45.6058065,"lon":0.1435898,"depth":null,"altitude":62.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0045/HY\" ;\"07096X0045\")","embedded":true,"imported":true},{"id":"BSS001UCQV","indice":"07096X0046","name":"P","designation":"P","commune":"TORSAC","place":"LA CHAPUSE","lat":45.5773751,"lon":0.1716278,"depth":3.0,"altitude":83.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0046/P\" ;\"07096X0046\")","embedded":true,"imported":true},{"id":"BSS001UCQX","indice":"07096X0049","name":"P","designation":"P","commune":"COURONNE","place":"CHEZ LIET","lat":45.5938992,"lon":0.1057245,"depth":20.3,"altitude":95.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0049/P\" ;\"07096X0049\")","embedded":true,"imported":true},{"id":"BSS001UCQY","indice":"07096X0050","name":"P","designation":"P","commune":"COURONNE","place":"ENVAUX","lat":45.5986154,"lon":0.1118192,"depth":18.0,"altitude":87.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0050/P\" ;\"07096X0050\")","embedded":true,"imported":true},{"id":"BSS001UCQZ","indice":"07096X0051","name":"P","designation":"P","commune":"COURONNE","place":"LE PÉRAT","lat":45.60124,"lon":0.1126194,"depth":20.0,"altitude":82.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0051/P\" ;\"07096X0051\")","embedded":true,"imported":true},{"id":"BSS001UCRA","indice":"07096X0052","name":"P","designation":"P","commune":"COURONNE","place":"LES SÉVERINS","lat":45.6040493,"lon":0.1192126,"depth":14.7,"altitude":92.21,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0052/P\" ;\"07096X0052\")","embedded":true,"imported":true},{"id":"BSS001UCRB","indice":"07096X0053","name":"P","designation":"P","commune":"COURONNE","place":"MOUGNAC","lat":45.601727,"lon":0.1281137,"depth":4.0,"altitude":118.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0053/P\" ;\"07096X0053\")","embedded":true,"imported":true},{"id":"BSS001UCRC","indice":"07096X0054","name":"P","designation":"P","commune":"VOEUIL ET GIGET","place":"LES COMBES","lat":45.603158,"lon":0.1599779,"depth":16.1,"altitude":98.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0054/P\" ;\"07096X0054\")","embedded":true,"imported":true},{"id":"BSS001UCRD","indice":"07096X0055","name":"P","designation":"P","commune":"PUYMOYEN","place":"PETITE PIERRE DURE","lat":45.6061672,"lon":0.1714031,"depth":17.3,"altitude":95.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0055/P\" ;\"07096X0055\")","embedded":true,"imported":true},{"id":"BSS001UCRE","indice":"07096X0056","name":"P","designation":"P","commune":"PUYMOYEN","place":"LE PETIT ROCHEFORT","lat":45.6170951,"lon":0.1591734,"depth":38.0,"altitude":109.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0056/P\" ;\"07096X0056\")","embedded":true,"imported":true},{"id":"BSS001UCRF","indice":"07096X0057","name":"HY","designation":"HY","commune":"COURONNE","place":"BARBARY","lat":45.6101343,"lon":0.139438,"depth":4.2,"altitude":60.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0057/HY\" ;\"07096X0057\")","embedded":true,"imported":true},{"id":"BSS001UCRG","indice":"07096X0058","name":"P","designation":"P","commune":"COURONNE","place":"LA PETITE TOURETTE","lat":45.6231267,"lon":0.1316142,"depth":14.0,"altitude":89.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0058/P\" ;\"07096X0058\")","embedded":true,"imported":true},{"id":"BSS001UCRH","indice":"07096X0059","name":"P","designation":"P","commune":"COURONNE","place":"LA TOURETTE","lat":45.61845,"lon":0.1411658,"depth":14.0,"altitude":84.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0059/P\" ;\"07096X0059\")","embedded":true,"imported":true},{"id":"BSS001UCRJ","indice":"07096X0060","name":"HY","designation":"HY","commune":"PUYMOYEN","place":"LES EAUX CLAIRES","lat":45.6216273,"lon":0.1470628,"depth":null,"altitude":55.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0060/HY\" ;\"07096X0060\")","embedded":true,"imported":true},{"id":"BSS001UCRK","indice":"07096X0061","name":"P","designation":"P","commune":"PUYMOYEN","place":"LES EAUX CLAIRES","lat":45.6176755,"lon":0.1518375,"depth":9.1,"altitude":60.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0061/P\" ;\"07096X0061\")","embedded":true,"imported":true},{"id":"BSS001UCRL","indice":"07096X0062","name":"HY","designation":"HY","commune":"PUYMOYEN","place":"CLAIRGON","lat":45.6233811,"lon":0.1540482,"depth":null,"altitude":67.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0062/HY\" ;\"07096X0062\")","embedded":true,"imported":true},{"id":"BSS001UCRM","indice":"07096X0063","name":"P","designation":"P","commune":"PUYMOYEN","place":"LE VERGER","lat":45.6152024,"lon":0.1730987,"depth":47.8,"altitude":134.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0063/P\" ;\"07096X0063\")","embedded":true,"imported":true},{"id":"BSS001UCRN","indice":"07096X0064","name":"P","designation":"P","commune":"PUYMOYEN","place":"CHEZ MARCHIVE","lat":45.6273593,"lon":0.1685098,"depth":10.5,"altitude":117.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0064/P\" ;\"07096X0064\")","embedded":true,"imported":true},{"id":"BSS001UCRP","indice":"07096X0065","name":"P","designation":"P","commune":"COURONNE","place":"LES CHAUMES","lat":45.6272226,"lon":0.1325193,"depth":3.0,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0065/P\" ;\"07096X0065\")","embedded":true,"imported":true},{"id":"BSS001UCRQ","indice":"07096X0066","name":"P","designation":"P","commune":"COURONNE","place":"BREUTY","lat":45.6173729,"lon":0.1183784,"depth":8.7,"altitude":55.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0066/P\" ;\"07096X0066\")","embedded":true,"imported":true},{"id":"BSS001UCRR","indice":"07096X0067","name":"P","designation":"P","commune":"COURONNE","place":"LE JONCO","lat":45.6230128,"lon":0.1123704,"depth":5.0,"altitude":44.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0067/P\" ;\"07096X0067\")","embedded":true,"imported":true},{"id":"BSS001UCRS","indice":"07096X0068","name":"P","designation":"P","commune":"COURONNE","place":"LE GRAND GIRAC","lat":45.6292825,"lon":0.1154597,"depth":7.0,"altitude":40.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0068/P\" ;\"07096X0068\")","embedded":true,"imported":true},{"id":"BSS001UCRT","indice":"07096X0069","name":"P","designation":"P","commune":"COURONNE","place":"LE MAS","lat":45.6250311,"lon":0.0962637,"depth":7.8,"altitude":62.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0069/P\" ;\"07096X0069\")","embedded":true,"imported":true},{"id":"BSS001UCRU","indice":"07096X0070","name":"T","designation":"T","commune":"COURONNE","place":"CENTRE PSYCHOTHERAPIQUE","lat":45.6227977,"lon":0.1194445,"depth":4.0,"altitude":42.0,"nature":"AFFLEUREMENT-EAU-SOUTERRAINE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0070/T\" ;\"07096X0070\")","embedded":true,"imported":true},{"id":"BSS001UCRV","indice":"07096X0071","name":"C","designation":"C","commune":"COURONNE","place":"","lat":45.6275469,"lon":0.0869234,"depth":null,"altitude":72.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0071/C\" ;\"07096X0071\")","embedded":true,"imported":true},{"id":"BSS001UCRW","indice":"07096X0072","name":"P","designation":"P","commune":"COURONNE","place":"","lat":45.628739,"lon":0.0971352,"depth":null,"altitude":57.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0072/P\" ;\"07096X0072\")","embedded":true,"imported":true},{"id":"BSS001UCRX","indice":"07096X0073","name":"S","designation":"S","commune":"ANGOULEME","place":"MA CAMPAGNE","lat":45.6261249,"lon":0.1513773,"depth":10.0,"altitude":95.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0073/S\" ;\"07096X0073\")","embedded":true,"imported":true},{"id":"BSS001UCRZ","indice":"07096X0075","name":"6","designation":"6","commune":"TORSAC","place":"LA CHAPUSE","lat":45.5783324,"lon":0.1699237,"depth":57.0,"altitude":83.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0075/6\" ;\"07096X0075\")","embedded":true,"imported":true},{"id":"BSS001UCSB","indice":"07096X0077","name":"S","designation":"S","commune":"COURONNE","place":"FONTAINE DU POIRIER","lat":45.6046441,"lon":0.1118387,"depth":null,"altitude":55.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0077/S\" ;\"07096X0077\")","embedded":true,"imported":true},{"id":"BSS001UCSE","indice":"07096X0084","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5629724,"lon":0.1593298,"depth":115.0,"altitude":137.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0084/F\" ;\"07096X0084\")","embedded":true,"imported":true},{"id":"BSS001UCSF","indice":"07096X0085","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5627905,"lon":0.1592621,"depth":110.0,"altitude":136.01,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0085/F\" ;\"07096X0085\")","embedded":true,"imported":true},{"id":"BSS001UCSG","indice":"07096X0089","name":"S","designation":"S","commune":"COURONNE","place":"","lat":45.5910642,"lon":0.1034084,"depth":null,"altitude":72.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0089/S\" ;\"07096X0089\")","embedded":true,"imported":true},{"id":"BSS001UCSH","indice":"07096X0090","name":"S","designation":"S","commune":"VOEUIL ET GIGET","place":"CITE DE VOEUIL ET GIGET","lat":45.5875437,"lon":0.1568126,"depth":72.0,"altitude":122.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0090/S\" ;\"07096X0090\")","embedded":true,"imported":true},{"id":"BSS001UCSJ","indice":"07096X0091","name":"C","designation":"C","commune":"MOUTHIERS SUR BOEME","place":"CHAUMES DE GRAND CHAMP","lat":45.5564815,"lon":0.0887971,"depth":12.0,"altitude":105.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0091/C\" ;\"07096X0091\")","embedded":true,"imported":true},{"id":"BSS001UCSK","indice":"07096X0092","name":"F","designation":"F","commune":"COURONNE","place":"GIRAUDEAU","lat":45.5886395,"lon":0.1346698,"depth":100.0,"altitude":100.71,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0092/F\" ;\"07096X0092\")","embedded":true,"imported":true},{"id":"BSS001UCSL","indice":"07096X0093","name":"HY","designation":"HY","commune":"VOEUIL ET GIGET","place":"LES ROCHES DE BOMPART","lat":45.5990204,"lon":0.1460319,"depth":null,"altitude":90.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0093/HY\" ;\"07096X0093\")","embedded":true,"imported":true},{"id":"BSS001UCSM","indice":"07096X0094","name":"F","designation":"F","commune":"VOEUIL ET GIGET","place":"BOMPART","lat":45.5999125,"lon":0.1456779,"depth":79.5,"altitude":77.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0094/F\" ;\"07096X0094\")","embedded":true,"imported":true},{"id":"BSS001UCSN","indice":"07096X0095","name":"S","designation":"S","commune":"VOEUIL ET GIGET","place":"BOMPART","lat":45.5990123,"lon":0.1457114,"depth":163.0,"altitude":78.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0095/S\" ;\"07096X0095\")","embedded":true,"imported":true},{"id":"BSS001UCSQ","indice":"07096X0097","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"CHEZ BOURGNET","lat":45.5551726,"lon":0.1630256,"depth":126.4,"altitude":130.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0097/F\" ;\"07096X0097\")","embedded":true,"imported":true},{"id":"BSS001UCSR","indice":"07096X0098","name":"F1","designation":"F1","commune":"MOUTHIERS SUR BOEME","place":"FERME MAUPAS","lat":45.5557217,"lon":0.1733736,"depth":127.0,"altitude":120.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0098/F1\" ;\"07096X0098\")","embedded":true,"imported":true},{"id":"BSS001UCSS","indice":"07096X0099","name":"F2","designation":"F2","commune":"MOUTHIERS SUR BOEME","place":"FERME MAUPAS","lat":45.5554518,"lon":0.1733873,"depth":89.0,"altitude":119.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0099/F2\" ;\"07096X0099\")","embedded":true,"imported":true},{"id":"BSS001UCST","indice":"07096X0100","name":"F3","designation":"F3","commune":"FOUQUEBRUNE","place":"LA BASSE VALLADE","lat":45.5552379,"lon":0.1763481,"depth":107.1,"altitude":125.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0100/F3\" ;\"07096X0100\")","embedded":true,"imported":true},{"id":"BSS001UCSU","indice":"07096X0101","name":"F","designation":"F","commune":"VOEUIL ET GIGET","place":"LES TURINS","lat":45.5866935,"lon":0.1563301,"depth":90.0,"altitude":122.7,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0101/F\" ;\"07096X0101\")","embedded":true,"imported":true},{"id":"BSS001UCSW","indice":"07096X0103","name":"C","designation":"C","commune":"COURONNE","place":"LA BERGERIE (33)","lat":45.6116304,"lon":0.1147612,"depth":null,"altitude":60.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0103/C\" ;\"07096X0103\")","embedded":true,"imported":true},{"id":"BSS001UCSX","indice":"07096X0104","name":"C","designation":"C","commune":"MOUTHIERS SUR BOEME","place":"LES CHAUMES DE GRAND CHAMP (N° 76)","lat":45.5533641,"lon":0.0902049,"depth":null,"altitude":120.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0104/C\" ;\"07096X0104\")","embedded":true,"imported":true},{"id":"BSS001UCSY","indice":"07096X0105","name":"C","designation":"C","commune":"COURONNE","place":"LA GARENNE ET BROUSSE MATEAU (N° 31)","lat":45.6274011,"lon":0.0886006,"depth":null,"altitude":73.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0105/C\" ;\"07096X0105\")","embedded":true,"imported":true},{"id":"BSS001UCSZ","indice":"07096X0106","name":"C","designation":"C","commune":"COURONNE","place":"LA PINOTERIE (N°32)","lat":45.6172208,"lon":0.0928595,"depth":null,"altitude":50.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0106/C\" ;\"07096X0106\")","embedded":true,"imported":true},{"id":"BSS001UCTB","indice":"07096X0108","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES SARAILLES","lat":45.5616368,"lon":0.1375917,"depth":85.0,"altitude":130.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0108/F\" ;\"07096X0108\")","embedded":true,"imported":true},{"id":"BSS001UCTC","indice":"07096X0112","name":"C","designation":"C","commune":"VOEUIL ET GIGET","place":"BARBARY","lat":45.6085264,"lon":0.1442455,"depth":null,"altitude":86.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0112/C\" ;\"07096X0112\")","embedded":true,"imported":true},{"id":"BSS001UCTD","indice":"07096X0113","name":"C","designation":"C","commune":"COURONNE","place":"LA CROIX DU MILIEU","lat":45.627404,"lon":0.1251511,"depth":null,"altitude":92.0,"nature":"EXCAVATION-CIEL-OUVERT","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0113/C\" ;\"07096X0113\")","embedded":true,"imported":true},{"id":"BSS001UCTG","indice":"07096X0116","name":"PUITS","designation":"PUITS","commune":"VOEUIL ET GIGET","place":"","lat":45.6036557,"lon":0.15329,"depth":null,"altitude":104.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0116/PUITS\" ;\"07096X0116\")","embedded":true,"imported":true},{"id":"BSS001UCTH","indice":"07096X0501","name":"F","designation":"F","commune":"COURONNE","place":"LA PICARDIE","lat":45.5893811,"lon":0.1048824,"depth":42.0,"altitude":65.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0501/F\" ;\"07096X0501\")","embedded":true,"imported":true},{"id":"BSS001UCTJ","indice":"07096X0502","name":"HY","designation":"HY","commune":"COURONNE","place":"STATION DE POMPAGE","lat":45.6205699,"lon":0.116196,"depth":3.0,"altitude":47.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0502/HY\" ;\"07096X0502\")","embedded":true,"imported":true},{"id":"BSS001UCTK","indice":"07096X0503","name":"LES NAULETS","designation":"AFFL","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5622197,"lon":0.1605613,"depth":122.0,"altitude":131.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0503/AFFL\" ;\"07096X0503\")","embedded":true,"imported":true},{"id":"BSS001UCTQ","indice":"07096X0508","name":"P","designation":"P","commune":"MOUTHIERS SUR BOEME","place":"CHEZ FAYARD","lat":45.5642605,"lon":0.1671657,"depth":null,"altitude":129.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0508/P\" ;\"07096X0508\")","embedded":true,"imported":true},{"id":"BSS001UCTS","indice":"07096X0510","name":"PRISE","designation":"PRISE","commune":"COURONNE","place":"LES BEAUVAIS","lat":45.6052349,"lon":0.0875831,"depth":null,"altitude":50.0,"nature":"AFFLEUREMENT-EAU","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0510/PRISE\" ;\"07096X0510\")","embedded":true,"imported":true},{"id":"BSS001UCTT","indice":"07096X0511","name":"AFLT-O","designation":"AFLT-O","commune":"MOUTHIERS SUR BOEME","place":"","lat":45.5549835,"lon":0.1222876,"depth":null,"altitude":65.0,"nature":"AFFLEUREMENT-EAU","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0511/AFLT-O\" ;\"07096X0511\")","embedded":true,"imported":true},{"id":"BSS001UCTU","indice":"07096X0512","name":"AFLT-O","designation":"AFLT-O","commune":"MOUTHIERS SUR BOEME","place":"","lat":45.5552208,"lon":0.1238144,"depth":null,"altitude":65.0,"nature":"AFFLEUREMENT-EAU","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0512/AFLT-O\" ;\"07096X0512\")","embedded":true,"imported":true},{"id":"BSS001UCTV","indice":"07096X0513","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5643668,"lon":0.1642355,"depth":92.0,"altitude":110.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0513/F\" ;\"07096X0513\")","embedded":true,"imported":true},{"id":"BSS001UCTW","indice":"07096X0514","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES FAYARDS","lat":45.5629914,"lon":0.1672177,"depth":125.0,"altitude":125.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0514/F\" ;\"07096X0514\")","embedded":true,"imported":true},{"id":"BSS001UCTX","indice":"07096X0515","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5647461,"lon":0.1607013,"depth":115.0,"altitude":132.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0515/F\" ;\"07096X0515\")","embedded":true,"imported":true},{"id":"BSS001UCTY","indice":"07096X0516","name":"F","designation":"F","commune":"COURONNE","place":"19 ROUTE DES GAUDINS","lat":45.5957714,"lon":0.1004027,"depth":20.0,"altitude":75.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0516/F\" ;\"07096X0516\")","embedded":true,"imported":true},{"id":"BSS001UCTZ","indice":"07096X0517","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5639232,"lon":0.1598711,"depth":78.0,"altitude":138.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0517/F\" ;\"07096X0517\")","embedded":true,"imported":true},{"id":"BSS001UCUA","indice":"07096X0518","name":"F","designation":"F","commune":"COURONNE","place":"11 ROUTE DE VOEUIL","lat":45.6082608,"lon":0.1049613,"depth":18.0,"altitude":52.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0518/F\" ;\"07096X0518\")","embedded":true,"imported":true},{"id":"BSS001UCUB","indice":"07096X0519","name":"P1","designation":"P1","commune":"COURONNE","place":"CIMENTERIE LAFARGE","lat":45.6111965,"lon":0.1055911,"depth":7.51,"altitude":47.79,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0519/P1\" ;\"07096X0519\")","embedded":true,"imported":true},{"id":"BSS001UCUC","indice":"07096X0520","name":"P3","designation":"P3","commune":"COURONNE","place":"","lat":45.6183295,"lon":0.1065024,"depth":null,"altitude":55.95,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0520/P3\" ;\"07096X0520\")","embedded":true,"imported":true},{"id":"BSS001UCUD","indice":"07096X0521","name":"P10","designation":"P10","commune":"COURONNE","place":"","lat":45.6170527,"lon":0.1076605,"depth":null,"altitude":52.38,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0521/P10\" ;\"07096X0521\")","embedded":true,"imported":true},{"id":"BSS001UCUE","indice":"07096X0522","name":"P11","designation":"P11","commune":"COURONNE","place":"","lat":45.6156544,"lon":0.1082985,"depth":null,"altitude":53.11,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0522/P11\" ;\"07096X0522\")","embedded":true,"imported":true},{"id":"BSS001UCUF","indice":"07096X0523","name":"P12","designation":"P12","commune":"COURONNE","place":"","lat":45.6161617,"lon":0.1059479,"depth":16.08,"altitude":53.11,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0523/P12\" ;\"07096X0523\")","embedded":true,"imported":true},{"id":"BSS001UCUG","indice":"07096X0524","name":"P13","designation":"P13","commune":"COURONNE","place":"","lat":45.6180226,"lon":0.1050803,"depth":23.26,"altitude":66.32,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0524/P13\" ;\"07096X0524\")","embedded":true,"imported":true},{"id":"BSS001UCUH","indice":"07096X0525","name":"P14","designation":"P14","commune":"COURONNE","place":"","lat":45.6185656,"lon":0.1062204,"depth":23.26,"altitude":66.65,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0525/P14\" ;\"07096X0525\")","embedded":true,"imported":true},{"id":"BSS001UCUJ","indice":"07096X0526","name":"P15","designation":"P15","commune":"COURONNE","place":"","lat":45.619212,"lon":0.1089346,"depth":null,"altitude":70.87,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0526/P15\" ;\"07096X0526\")","embedded":true,"imported":true},{"id":"BSS001UCUK","indice":"07096X0527","name":"BROCHO","designation":"BROCHO","commune":"COURONNE","place":"","lat":45.6129658,"lon":0.1046641,"depth":null,"altitude":50.2,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0527/BROCHO\" ;\"07096X0527\")","embedded":true,"imported":true},{"id":"BSS001UCUL","indice":"07096X0528","name":"CHEMIN","designation":"CHEMIN","commune":"COURONNE","place":"","lat":45.6143254,"lon":0.104272,"depth":9.8,"altitude":50.55,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0528/CHEMIN\" ;\"07096X0528\")","embedded":true,"imported":true},{"id":"BSS001UCUM","indice":"07096X0529","name":"SOURCE","designation":"SOURCE","commune":"COURONNE","place":"CHANTEMERLE","lat":45.6261289,"lon":0.1126574,"depth":null,"altitude":44.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0529/SOURCE\" ;\"07096X0529\")","embedded":true,"imported":true},{"id":"BSS001UCUN","indice":"07096X0530","name":"S","designation":"S","commune":"COURONNE","place":"LA BROUSSE","lat":45.6297055,"lon":0.0951324,"depth":null,"altitude":60.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0530/S\" ;\"07096X0530\")","embedded":true,"imported":true},{"id":"BSS001UCUP","indice":"07096X0531","name":"S","designation":"S","commune":"COURONNE","place":"COTHIERS","lat":45.6170401,"lon":0.1240326,"depth":null,"altitude":47.0,"nature":"ouvrage BSS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0531/S\" ;\"07096X0531\")","embedded":true,"imported":true},{"id":"BSS001UCUQ","indice":"07096X0532","name":"S","designation":"S","commune":"COURONNE","place":"LA TOURETTE","lat":45.6193668,"lon":0.1417862,"depth":null,"altitude":61.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0532/S\" ;\"07096X0532\")","embedded":true,"imported":true},{"id":"BSS001UCUR","indice":"07096X0533","name":"S","designation":"S","commune":"COURONNE","place":"LA PETITE TOURETTE","lat":45.6230047,"lon":0.1374377,"depth":null,"altitude":50.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0533/S\" ;\"07096X0533\")","embedded":true,"imported":true},{"id":"BSS001UCUS","indice":"07096X0534","name":"S","designation":"S","commune":"COURONNE","place":"LA TOURETTE","lat":45.6195822,"lon":0.1428151,"depth":null,"altitude":55.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0534/S\" ;\"07096X0534\")","embedded":true,"imported":true},{"id":"BSS001UCUT","indice":"07096X0535","name":"S","designation":"S","commune":"ANGOULEME","place":"BELLE ROCHE","lat":45.6236467,"lon":0.1431962,"depth":null,"altitude":53.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0535/S\" ;\"07096X0535\")","embedded":true,"imported":true},{"id":"BSS001UCUU","indice":"07096X0536","name":"S","designation":"S","commune":"PUYMOYEN","place":"CLAIRGON","lat":45.6230909,"lon":0.1539732,"depth":null,"altitude":68.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0536/S\" ;\"07096X0536\")","embedded":true,"imported":true},{"id":"BSS001UCUV","indice":"07096X0537","name":"S","designation":"S","commune":"COURONNE","place":"LES EAUX CLAIRES","lat":45.616765,"lon":0.1471977,"depth":null,"altitude":83.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0537/S\" ;\"07096X0537\")","embedded":true,"imported":true},{"id":"BSS001UCUW","indice":"07096X0538","name":"S","designation":"S","commune":"VOEUIL ET GIGET","place":"LES PETITS CHAMPS","lat":45.6103837,"lon":0.1570911,"depth":null,"altitude":68.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0538/S\" ;\"07096X0538\")","embedded":true,"imported":true},{"id":"BSS001UCUX","indice":"07096X0539","name":"S","designation":"S","commune":"PUYMOYEN","place":"LE MOULIN DU VERGER","lat":45.6075114,"lon":0.1732601,"depth":null,"altitude":68.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0539/S\" ;\"07096X0539\")","embedded":true,"imported":true},{"id":"BSS001UCUY","indice":"07096X0540","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LE GIRAUDEAU","lat":45.586947,"lon":0.1379143,"depth":null,"altitude":85.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0540/S\" ;\"07096X0540\")","embedded":true,"imported":true},{"id":"BSS001UCUZ","indice":"07096X0541","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LE GIRAUDEAU","lat":45.5860983,"lon":0.136431,"depth":null,"altitude":80.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0541/S\" ;\"07096X0541\")","embedded":true,"imported":true},{"id":"BSS001UCVA","indice":"07096X0542","name":"S","designation":"S","commune":"TORSAC","place":"LA SALMONIE","lat":45.5775274,"lon":0.1755334,"depth":null,"altitude":82.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0542/S\" ;\"07096X0542\")","embedded":true,"imported":true},{"id":"BSS001UCVB","indice":"07096X0543","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"FONTAINE DU ROC","lat":45.5725207,"lon":0.1592125,"depth":null,"altitude":89.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0543/S\" ;\"07096X0543\")","embedded":true,"imported":true},{"id":"BSS001UCVC","indice":"07096X0544","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"FONTAINE DES BARRES","lat":45.5690456,"lon":0.1618281,"depth":null,"altitude":96.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0544/S\" ;\"07096X0544\")","embedded":true,"imported":true},{"id":"BSS001UCVF","indice":"07096X0547","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"GRAND CHAMPS","lat":45.5596422,"lon":0.0921971,"depth":null,"altitude":65.0,"nature":"ouvrage BSS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0547/S\" ;\"07096X0547\")","embedded":true,"imported":true},{"id":"BSS001UCVG","indice":"07096X0548","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"PONTY","lat":45.5604319,"lon":0.0882434,"depth":null,"altitude":69.0,"nature":"ouvrage BSS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0548/S\" ;\"07096X0548\")","embedded":true,"imported":true},{"id":"BSS001UCVH","indice":"07096X0549","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"CHEZ LERAUD","lat":45.5627535,"lon":0.1171252,"depth":null,"altitude":68.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0549/S\" ;\"07096X0549\")","embedded":true,"imported":true},{"id":"BSS001UCVJ","indice":"07096X0550","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LES AGRIERS","lat":45.5656804,"lon":0.1353817,"depth":null,"altitude":121.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0550/S\" ;\"07096X0550\")","embedded":true,"imported":true},{"id":"BSS001UCVK","indice":"07096X0551","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LE GRAND GUILLON","lat":45.5681806,"lon":0.1154703,"depth":null,"altitude":65.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0551/S\" ;\"07096X0551\")","embedded":true,"imported":true},{"id":"BSS001UCVL","indice":"07096X0552","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LE CHATAIGNIER","lat":45.5786074,"lon":0.1120149,"depth":null,"altitude":65.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0552/S\" ;\"07096X0552\")","embedded":true,"imported":true},{"id":"BSS001UCVM","indice":"07096X0553","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LE CHATAIGNIER","lat":45.5792896,"lon":0.1122616,"depth":null,"altitude":74.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0553/S\" ;\"07096X0553\")","embedded":true,"imported":true},{"id":"BSS001UCVN","indice":"07096X0554","name":"S","designation":"S","commune":"MOUTHIERS SUR BOEME","place":"LE CHATAIGNIER","lat":45.5795848,"lon":0.1125286,"depth":null,"altitude":84.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0554/S\" ;\"07096X0554\")","embedded":true,"imported":true},{"id":"BSS001UCVP","indice":"07096X0555","name":"S","designation":"S","commune":"COURONNE","place":"CLEMENCEAU","lat":45.5878319,"lon":0.0993165,"depth":null,"altitude":59.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0555/S\" ;\"07096X0555\")","embedded":true,"imported":true},{"id":"BSS001UCVQ","indice":"07096X0556","name":"S","designation":"S","commune":"COURONNE","place":"FONTAINE MALIBAS","lat":45.5910679,"lon":0.1137142,"depth":null,"altitude":95.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0556/S\" ;\"07096X0556\")","embedded":true,"imported":true},{"id":"BSS001UCVR","indice":"07096X0557","name":"S","designation":"S","commune":"COURONNE","place":"LA FONTAINE VACHER","lat":45.593792,"lon":0.0952824,"depth":null,"altitude":60.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0557/S\" ;\"07096X0557\")","embedded":true,"imported":true},{"id":"BSS001UCVS","indice":"07096X0558","name":"S","designation":"S","commune":"COURONNE","place":"LES GAUDINS","lat":45.5969835,"lon":0.1100302,"depth":null,"altitude":60.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0558/S\" ;\"07096X0558\")","embedded":true,"imported":true},{"id":"BSS001UCVT","indice":"07096X0559","name":"S","designation":"S","commune":"COURONNE","place":"LE PERAT","lat":45.6022379,"lon":0.1114763,"depth":null,"altitude":58.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0559/S\" ;\"07096X0559\")","embedded":true,"imported":true},{"id":"BSS001UCVU","indice":"07096X0560","name":"S","designation":"S","commune":"COURONNE","place":"LES SEVERINS","lat":45.6052146,"lon":0.1130028,"depth":null,"altitude":55.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0560/S\" ;\"07096X0560\")","embedded":true,"imported":true},{"id":"BSS001UCVV","indice":"07096X0561","name":"S","designation":"S","commune":"COURONNE","place":"LES SEVERINS","lat":45.6056292,"lon":0.1119542,"depth":null,"altitude":53.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0561/S\" ;\"07096X0561\")","embedded":true,"imported":true},{"id":"BSS001UCVW","indice":"07096X0562","name":"S","designation":"S","commune":"COURONNE","place":"LA FONTAINE DU POIRIER","lat":45.6080226,"lon":0.1107638,"depth":null,"altitude":52.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0562/S\" ;\"07096X0562\")","embedded":true,"imported":true},{"id":"BSS001UCVX","indice":"07096X0563","name":"S","designation":"S","commune":"COURONNE","place":"LE COQ GAULOIS","lat":45.6142404,"lon":0.0978309,"depth":null,"altitude":50.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0563/S\" ;\"07096X0563\")","embedded":true,"imported":true},{"id":"BSS001UCVY","indice":"07096X0564","name":"S","designation":"S","commune":"COURONNE","place":"LE COQ GAULOIS","lat":45.6151279,"lon":0.0983493,"depth":null,"altitude":55.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0564/S\" ;\"07096X0564\")","embedded":true,"imported":true},{"id":"BSS001UCVZ","indice":"07096X0565","name":"S","designation":"S","commune":"COURONNE","place":"LA GARENNE","lat":45.6285252,"lon":0.0940898,"depth":null,"altitude":60.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0565/S\" ;\"07096X0565\")","embedded":true,"imported":true},{"id":"BSS001UCWA","indice":"07096X0566","name":"F","designation":"F","commune":"COURONNE","place":"","lat":45.6110898,"lon":0.096558,"depth":20.0,"altitude":48.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0566/F\" ;\"07096X0566\")","embedded":true,"imported":true},{"id":"BSS001UCWB","indice":"07096X0567","name":"F","designation":"F","commune":"COURONNE","place":"L'OISELLERIE","lat":45.6248835,"lon":0.1024229,"depth":120.0,"altitude":53.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0567/F\" ;\"07096X0567\")","embedded":true,"imported":true},{"id":"BSS001UCWC","indice":"07096X0568","name":"P","designation":"P","commune":"COURONNE","place":"LE COQ","lat":45.6080368,"lon":0.0906968,"depth":8.5,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0568/P\" ;\"07096X0568\")","embedded":true,"imported":true},{"id":"BSS001UCWD","indice":"07096X0569","name":"P","designation":"P","commune":"COURONNE","place":"PUITS VILLAGE","lat":45.6086901,"lon":0.100638,"depth":5.0,"altitude":55.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0569/P\" ;\"07096X0569\")","embedded":true,"imported":true},{"id":"BSS001UCWE","indice":"07096X0570","name":"P","designation":"P","commune":"COURONNE","place":"PUIT","lat":45.5957089,"lon":0.0997256,"depth":11.0,"altitude":68.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0570/P\" ;\"07096X0570\")","embedded":true,"imported":true},{"id":"BSS001UCWF","indice":"07096X0571","name":"P","designation":"P","commune":"COURONNE","place":"ROUTE DE BORDEAUX","lat":45.6099191,"lon":0.0941414,"depth":8.0,"altitude":50.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0571/P\" ;\"07096X0571\")","embedded":true,"imported":true},{"id":"BSS001UCWG","indice":"07096X0572","name":"P","designation":"P","commune":"COURONNE","place":"ROUTE DE BORDEAUX","lat":45.6098467,"lon":0.094479,"depth":13.75,"altitude":53.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0572/P\" ;\"07096X0572\")","embedded":true,"imported":true},{"id":"BSS001UCWH","indice":"07096X0573","name":"P","designation":"P","commune":"COURONNE","place":"LA CROISADE","lat":45.616387,"lon":0.0982577,"depth":4.11,"altitude":56.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0573/P\" ;\"07096X0573\")","embedded":true,"imported":true},{"id":"BSS001UCWJ","indice":"07096X0574","name":"P","designation":"P","commune":"COURONNE","place":"LA CROISADE","lat":45.6158918,"lon":0.0982708,"depth":3.67,"altitude":55.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0574/P\" ;\"07096X0574\")","embedded":true,"imported":true},{"id":"BSS001UCWK","indice":"07096X0575","name":"P","designation":"P","commune":"COURONNE","place":"PINOTIERE","lat":45.6208832,"lon":0.0905741,"depth":3.64,"altitude":68.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0575/P\" ;\"07096X0575\")","embedded":true,"imported":true},{"id":"BSS001UCWL","indice":"07096X0576","name":"P","designation":"P","commune":"COURONNE","place":"LE MAS","lat":45.6254134,"lon":0.0957171,"depth":6.83,"altitude":64.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0576/P\" ;\"07096X0576\")","embedded":true,"imported":true},{"id":"BSS001UCWM","indice":"07096X0577","name":"P","designation":"P","commune":"COURONNE","place":"LE MAS","lat":45.6262629,"lon":0.0940672,"depth":5.5,"altitude":67.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0577/P\" ;\"07096X0577\")","embedded":true,"imported":true},{"id":"BSS001UCWN","indice":"07096X0578","name":"P","designation":"P","commune":"COURONNE","place":"","lat":45.6247087,"lon":0.094945,"depth":5.0,"altitude":64.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0578/P\" ;\"07096X0578\")","embedded":true,"imported":true},{"id":"BSS001UCWP","indice":"07096X0579","name":"P","designation":"P","commune":"COURONNE","place":"","lat":45.6246859,"lon":0.0958066,"depth":6.5,"altitude":63.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0579/P\" ;\"07096X0579\")","embedded":true,"imported":true},{"id":"BSS001UCWQ","indice":"07096X0580","name":"PZ","designation":"PZ","commune":"COURONNE","place":"CARRIERE DE LA COURONNE","lat":45.6099399,"lon":0.120524,"depth":44.6,"altitude":89.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0580/PZ\" ;\"07096X0580\")","embedded":true,"imported":true},{"id":"BSS001UCWS","indice":"07096X0582","name":"PZ20","designation":"PZ20","commune":"COURONNE","place":"USINE LAFARGE","lat":45.6151613,"lon":0.1076951,"depth":null,"altitude":62.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0582/PZ20\" ;\"07096X0582\")","embedded":true,"imported":true},{"id":"BSS001UCWT","indice":"07096X0583","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LES NAULETS","lat":45.5631599,"lon":0.1613982,"depth":100.0,"altitude":131.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0583/F\" ;\"07096X0583\")","embedded":true,"imported":true},{"id":"BSS001UCWU","indice":"07096X0584","name":"F","designation":"F","commune":"COURONNE","place":"7 CHEZ MARTIN (LE CLOS MARTIN)","lat":45.6073778,"lon":0.089255,"depth":24.0,"altitude":55.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0584/F\" ;\"07096X0584\")","embedded":true,"imported":true},{"id":"BSS001UCWV","indice":"07096X0585","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"Naulets","lat":45.5647551,"lon":0.1607008,"depth":null,"altitude":134.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0585/F\" ;\"07096X0585\")","embedded":true,"imported":true},{"id":"BSS001UCWW","indice":"07096X0586","name":"PZ10B","designation":"PZ10B","commune":"COURONNE","place":"Cote de Ma Campagne","lat":45.6170644,"lon":0.1077626,"depth":11.6,"altitude":52.3,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07096X0586/PZ10B\" ;\"07096X0586\")","embedded":true,"imported":true},{"id":"BSS001UCWY","indice":"07097X0001","name":"S","designation":"S","commune":"GARAT","place":"M.DESCHAMPS","lat":45.61894,"lon":0.2273251,"depth":2.5,"altitude":85.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0001/S\" ;\"07097X0001\")","embedded":true,"imported":true},{"id":"BSS001UCWZ","indice":"07097X0002","name":"S","designation":"S","commune":"DIRAC","place":"M.DESCHAMPS","lat":45.6171846,"lon":0.2248322,"depth":2.5,"altitude":84.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0002/S\" ;\"07097X0002\")","embedded":true,"imported":true},{"id":"BSS001UCXA","indice":"07097X0003","name":"S","designation":"S","commune":"DIRAC","place":"M.DESCHAMPS","lat":45.6171846,"lon":0.2248322,"depth":6.45,"altitude":83.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0003/S\" ;\"07097X0003\")","embedded":true,"imported":true},{"id":"BSS001UCXB","indice":"07097X0004","name":"S","designation":"S","commune":"DIRAC","place":"M.DESCHAMPS","lat":45.6171846,"lon":0.2248322,"depth":6.45,"altitude":83.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0004/S\" ;\"07097X0004\")","embedded":true,"imported":true},{"id":"BSS001UCXC","indice":"07097X0005","name":"GL","designation":"GL","commune":"SOYAUX","place":"BOIS DU BRESSOUR","lat":45.6258336,"lon":0.1971741,"depth":null,"altitude":72.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0005/GL\" ;\"07097X0005\")","embedded":true,"imported":true},{"id":"BSS001UCXG","indice":"07097X0009","name":"GL","designation":"GL","commune":"DIRAC","place":"SAINT-MARC","lat":45.6286146,"lon":0.1869391,"depth":null,"altitude":91.0,"nature":"CAVITE-NATURELLE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0009/GL\" ;\"07097X0009\")","embedded":true,"imported":true},{"id":"BSS001UCXK","indice":"07097X0012","name":"F","designation":"F","commune":"SOYAUX","place":"LE GOT","lat":45.6210459,"lon":0.215188,"depth":31.5,"altitude":76.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0012/F\" ;\"07097X0012\")","embedded":true,"imported":true},{"id":"BSS001UCXL","indice":"07097X0013","name":"GOT","designation":"GOT","commune":"GARAT","place":"LE GOT","lat":45.6205024,"lon":0.2194398,"depth":5.0,"altitude":79.0,"nature":"AFFLEUREMENT-EAU-SOUTERRAINE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0013/GOT\" ;\"07097X0013\")","embedded":true,"imported":true},{"id":"BSS001UCXM","indice":"07097X0014","name":"HY","designation":"HY","commune":"SOYAUX","place":"PEUX","lat":45.6215637,"lon":0.2080866,"depth":1.0,"altitude":68.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0014/HY\" ;\"07097X0014\")","embedded":true,"imported":true},{"id":"BSS001UCXN","indice":"07097X0015","name":"F","designation":"F","commune":"FOUQUEBRUNE","place":"LA HAUTE VALLADE","lat":45.5555996,"lon":0.1810624,"depth":77.0,"altitude":130.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0015/F\" ;\"07097X0015\")","embedded":true,"imported":true},{"id":"BSS001UCXT","indice":"07097X0020","name":"LA BORDE","designation":"P","commune":"TORSAC","place":"LA BORDE","lat":45.5662371,"lon":0.2290886,"depth":5.8,"altitude":138.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0020/P\" ;\"07097X0020\")","embedded":true,"imported":true},{"id":"BSS001UCXW","indice":"07097X0023","name":"RUYMARD","designation":"P","commune":"FOUQUEBRUNE","place":"RUYMARD","lat":45.5553756,"lon":0.1929888,"depth":12.62,"altitude":169.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0023/P\" ;\"07097X0023\")","embedded":true,"imported":true},{"id":"BSS001UCXX","indice":"07097X0024","name":"CHEZ SANDRINS","designation":"P","commune":"TORSAC","place":"CHEZ SANDRINS","lat":45.5551309,"lon":0.2081225,"depth":20.3,"altitude":144.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0024/P\" ;\"07097X0024\")","embedded":true,"imported":true},{"id":"BSS001UCXY","indice":"07097X0025","name":"LE CHATEAU","designation":"P","commune":"TORSAC","place":"LE CHATEAU","lat":45.5634496,"lon":0.215105,"depth":13.0,"altitude":117.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0025/P\" ;\"07097X0025\")","embedded":true,"imported":true},{"id":"BSS001UCXZ","indice":"07097X0026","name":"LA SALMONIE","designation":"P","commune":"TORSAC","place":"LA SALMONIE","lat":45.5749502,"lon":0.1766013,"depth":39.0,"altitude":122.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0026/P\" ;\"07097X0026\")","embedded":true,"imported":true},{"id":"BSS001UCYA","indice":"07097X0027","name":"CHEZ JOLY","designation":"P","commune":"TORSAC","place":"CHEZ JOLY","lat":45.5676108,"lon":0.187905,"depth":29.0,"altitude":115.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0027/P\" ;\"07097X0027\")","embedded":true,"imported":true},{"id":"BSS001UCYB","indice":"07097X0028","name":"F","designation":"F","commune":"TORSAC","place":"MOUSSONNERIE","lat":45.5758081,"lon":0.1932243,"depth":47.0,"altitude":120.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0028/F\" ;\"07097X0028\")","embedded":true,"imported":true},{"id":"BSS001UCYF","indice":"07097X0032","name":"LA PETITE COURRIERE","designation":"P","commune":"TORSAC","place":"LA PETITE COURRIERE","lat":45.574773,"lon":0.2332421,"depth":6.9,"altitude":129.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0032/P\" ;\"07097X0032\")","embedded":true,"imported":true},{"id":"BSS001UCYG","indice":"07097X0033","name":"LA PETITE COURRIERE","designation":"P","commune":"TORSAC","place":"LA PETITE COURRIERE","lat":45.5787921,"lon":0.2365572,"depth":6.8,"altitude":119.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0033/P\" ;\"07097X0033\")","embedded":true,"imported":true},{"id":"BSS001UCYR","indice":"07097X0042","name":"POUYAU","designation":"P","commune":"DIRAC","place":"POUYAU","lat":45.603141,"lon":0.2202342,"depth":6.2,"altitude":145.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0042/P\" ;\"07097X0042\")","embedded":true,"imported":true},{"id":"BSS001UCYS","indice":"07097X0043","name":"SAUVIGNAC","designation":"P","commune":"DIRAC","place":"SAUVIGNAC","lat":45.6000447,"lon":0.2276674,"depth":9.2,"altitude":148.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0043/P\" ;\"07097X0043\")","embedded":true,"imported":true},{"id":"BSS001UCYT","indice":"07097X0044","name":"LE PERCHET","designation":"P","commune":"DIRAC","place":"LE PERCHET","lat":45.5920834,"lon":0.2300164,"depth":29.0,"altitude":151.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0044/P\" ;\"07097X0044\")","embedded":true,"imported":true},{"id":"BSS001UCYU","indice":"07097X0045","name":"CHEZ GORY","designation":"P","commune":"TORSAC","place":"CHEZ GORY","lat":45.5917287,"lon":0.2065738,"depth":12.0,"altitude":119.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0045/P\" ;\"07097X0045\")","embedded":true,"imported":true},{"id":"BSS001UCYV","indice":"07097X0046","name":"PUYMERLE","designation":"P","commune":"TORSAC","place":"PUYMERLE","lat":45.583527,"lon":0.214109,"depth":25.0,"altitude":121.92,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0046/P\" ;\"07097X0046\")","embedded":true,"imported":true},{"id":"BSS001UCYW","indice":"07097X0047","name":"PUYMERLE","designation":"P","commune":"TORSAC","place":"PUYMERLE","lat":45.5841644,"lon":0.2158349,"depth":23.1,"altitude":128.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0047/P\" ;\"07097X0047\")","embedded":true,"imported":true},{"id":"BSS001UCYX","indice":"07097X0048","name":"CHARSÉ","designation":"P","commune":"PUYMOYEN","place":"CHARSÉ","lat":45.5922344,"lon":0.1766833,"depth":8.2,"altitude":133.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0048/P\" ;\"07097X0048\")","embedded":true,"imported":true},{"id":"BSS001UCYY","indice":"07097X0049","name":"CHAMOUARD","designation":"P","commune":"PUYMOYEN","place":"CHAMOUARD","lat":45.5976837,"lon":0.183786,"depth":16.5,"altitude":118.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0049/P\" ;\"07097X0049\")","embedded":true,"imported":true},{"id":"BSS001UCYZ","indice":"07097X0050","name":"BOURG","designation":"P","commune":"PUYMOYEN","place":"BOURG","lat":45.612419,"lon":0.1828314,"depth":33.3,"altitude":131.28,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0050/P\" ;\"07097X0050\")","embedded":true,"imported":true},{"id":"BSS001UCZA","indice":"07097X0051","name":"PEUSSEC","designation":"P","commune":"PUYMOYEN","place":"PEUSSEC","lat":45.626176,"lon":0.1820289,"depth":36.4,"altitude":112.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0051/P\" ;\"07097X0051\")","embedded":true,"imported":true},{"id":"BSS001UCZB","indice":"07097X0052","name":"HURTEBISE","designation":"P","commune":"PUYMOYEN","place":"HURTEBISE","lat":45.6202403,"lon":0.2012451,"depth":17.8,"altitude":121.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0052/P\" ;\"07097X0052\")","embedded":true,"imported":true},{"id":"BSS001UCZC","indice":"07097X0053","name":"LE MAINE NEUF","designation":"P","commune":"DIRAC","place":"LE MAINE NEUF","lat":45.6086198,"lon":0.2002788,"depth":32.0,"altitude":146.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0053/P\" ;\"07097X0053\")","embedded":true,"imported":true},{"id":"BSS001UCZD","indice":"07097X0054","name":"LE TIL","designation":"P","commune":"DIRAC","place":"LE TIL","lat":45.6053622,"lon":0.2138711,"depth":18.0,"altitude":140.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0054/P\" ;\"07097X0054\")","embedded":true,"imported":true},{"id":"BSS001UCZE","indice":"07097X0055","name":"LE GOT","designation":"P","commune":"SOYAUX","place":"LE GOT OU LA COLINETTE","lat":45.6209686,"lon":0.2157055,"depth":5.5,"altitude":76.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0055/P\" ;\"07097X0055\")","embedded":true,"imported":true},{"id":"BSS001UCZF","indice":"07097X0056","name":"LE GOT","designation":"P","commune":"DIRAC","place":"LE GOT","lat":45.6184482,"lon":0.2158065,"depth":8.2,"altitude":97.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0056/P\" ;\"07097X0056\")","embedded":true,"imported":true},{"id":"BSS001UCZG","indice":"07097X0057","name":"TORSAC","designation":"3","commune":"TORSAC","place":"ANDOLE","lat":45.5687353,"lon":0.1972129,"depth":45.0,"altitude":97.93,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0057/3\" ;\"07097X0057\")","embedded":true,"imported":true},{"id":"BSS001UCZH","indice":"07097X0058","name":"4","designation":"4","commune":"DIRAC","place":"LE MOULIN DE LA BOISSIERE","lat":45.5886801,"lon":0.2166219,"depth":40.0,"altitude":103.5,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0058/4\" ;\"07097X0058\")","embedded":true,"imported":true},{"id":"BSS001UCZK","indice":"07097X0062","name":"F","designation":"F","commune":"FOUQUEBRUNE","place":"LA HAUTE VALLADE 2","lat":45.5549259,"lon":0.1836618,"depth":105.0,"altitude":132.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0062/F\" ;\"07097X0062\")","embedded":true,"imported":true},{"id":"BSS001UCZL","indice":"07097X0063","name":"F","designation":"F","commune":"SOYAUX","place":"LE GOT","lat":45.6201584,"lon":0.2157334,"depth":28.0,"altitude":76.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0063/F\" ;\"07097X0063\")","embedded":true,"imported":true},{"id":"BSS001UCZN","indice":"07097X0065","name":"F","designation":"F","commune":"TORSAC","place":"CHEZ NAULET","lat":45.5622893,"lon":0.2301324,"depth":81.0,"altitude":110.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0065/F\" ;\"07097X0065\")","embedded":true,"imported":true},{"id":"BSS001UCZP","indice":"07097X0066","name":"FORAGE DE ANDOLE","designation":"S","commune":"TORSAC","place":"ANDOLE","lat":45.567386,"lon":0.199834,"depth":49.0,"altitude":99.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0066/S\" ;\"07097X0066\")","embedded":true,"imported":true},{"id":"BSS001UCZR","indice":"07097X0068","name":"P","designation":"P","commune":"DIRAC","place":"LE LYON","lat":45.6287374,"lon":0.187164,"depth":null,"altitude":80.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0068/P\" ;\"07097X0068\")","embedded":true,"imported":true},{"id":"BSS001UCZS","indice":"07097X0069","name":"S","designation":"S","commune":"TORSAC","place":"FONTAINE DU PONT ROI","lat":45.5690177,"lon":0.1955309,"depth":2.0,"altitude":94.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0069/S\" ;\"07097X0069\")","embedded":true,"imported":true},{"id":"BSS001UCZT","indice":"07097X0070","name":"F","designation":"F","commune":"MOUTHIERS SUR BOEME","place":"LA HAUTE VALLADE","lat":45.5591567,"lon":0.1834982,"depth":92.0,"altitude":147.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0070/F\" ;\"07097X0070\")","embedded":true,"imported":true},{"id":"BSS001UCZU","indice":"07097X0071","name":"P","designation":"P","commune":"TORSAC","place":"Chez Gory","lat":45.5897644,"lon":0.2123837,"depth":null,"altitude":105.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0071/P\" ;\"07097X0071\")","embedded":true,"imported":true},{"id":"BSS001UCZW","indice":"07097X0073","name":"P","designation":"P","commune":"TORSAC","place":"LES GARANDS","lat":45.5623402,"lon":0.232567,"depth":2.0,"altitude":110.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0073/P\" ;\"07097X0073\")","embedded":true,"imported":true},{"id":"BSS001UCZX","indice":"07097X0074","name":"P","designation":"P","commune":"DIRAC","place":"La Prévalerie","lat":45.5854606,"lon":0.2259844,"depth":null,"altitude":127.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0074/P\" ;\"07097X0074\")","embedded":true,"imported":true},{"id":"BSS001UCZZ","indice":"07097X0076","name":"F","designation":"F","commune":"GARAT","place":"LA COLINETTE","lat":45.6199497,"lon":0.218954,"depth":30.0,"altitude":77.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0076/F\" ;\"07097X0076\")","embedded":true,"imported":true},{"id":"BSS001UDAA","indice":"07097X0077","name":"S","designation":"S","commune":"DIRAC","place":"LE GOT","lat":45.6193126,"lon":0.2183311,"depth":200.0,"altitude":88.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0077/S\" ;\"07097X0077\")","embedded":true,"imported":true},{"id":"BSS001UDAB","indice":"07097X0508","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5978624,"lon":0.202491,"depth":15.3,"altitude":98.92,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0508/S\" ;\"07097X0508\")","embedded":true,"imported":true},{"id":"BSS001UDAC","indice":"07097X0509","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5975764,"lon":0.2018637,"depth":10.0,"altitude":91.37,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0509/S\" ;\"07097X0509\")","embedded":true,"imported":true},{"id":"BSS001UDAD","indice":"07097X0510","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5975828,"lon":0.20212,"depth":14.45,"altitude":92.21,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0510/S\" ;\"07097X0510\")","embedded":true,"imported":true},{"id":"BSS001UDAE","indice":"07097X0511","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - EN AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5973965,"lon":0.2018728,"depth":20.0,"altitude":91.35,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0511/S\" ;\"07097X0511\")","embedded":true,"imported":true},{"id":"BSS001UDAF","indice":"07097X0512","name":"S","designation":"S","commune":"TORSAC","place":"VALLEE DES EAUX CLAIRES - EN AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5971169,"lon":0.2015018,"depth":21.0,"altitude":91.78,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0512/S\" ;\"07097X0512\")","embedded":true,"imported":true},{"id":"BSS001UDAG","indice":"07097X0513","name":"S","designation":"S","commune":"TORSAC","place":"VALLEE DES EAUX CLAIRES - EN AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5971105,"lon":0.2012454,"depth":10.0,"altitude":92.45,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0513/S\" ;\"07097X0513\")","embedded":true,"imported":true},{"id":"BSS001UDAH","indice":"07097X0514","name":"S","designation":"S","commune":"TORSAC","place":"VALLEE DES EAUX CLAIRES - EN AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5967433,"lon":0.2006094,"depth":1.0,"altitude":100.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0514/S\" ;\"07097X0514\")","embedded":true,"imported":true},{"id":"BSS001UDAJ","indice":"07097X0515","name":"S","designation":"S","commune":"TORSAC","place":"VALLEE DES EAUX CLAIRES - EN AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5969462,"lon":0.2018827,"depth":10.0,"altitude":91.91,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0515/S\" ;\"07097X0515\")","embedded":true,"imported":true},{"id":"BSS001UDAK","indice":"07097X0516","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - EN AMONT DU MOULIN DE COMBE DE LOUP","lat":45.5967923,"lon":0.2033023,"depth":4.0,"altitude":93.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0516/S\" ;\"07097X0516\")","embedded":true,"imported":true},{"id":"BSS001UDAL","indice":"07097X0517","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - ENTRE COMBE DE LOUP ET BOISSIERE","lat":45.5975545,"lon":0.2053303,"depth":3.0,"altitude":98.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0517/S\" ;\"07097X0517\")","embedded":true,"imported":true},{"id":"BSS001UDAM","indice":"07097X0518","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - ENTRE COMBE DE LOUP ET BOISSIERE","lat":45.5965611,"lon":0.2052392,"depth":3.0,"altitude":94.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0518/S\" ;\"07097X0518\")","embedded":true,"imported":true},{"id":"BSS001UDAN","indice":"07097X0519","name":"S","designation":"S","commune":"TORSAC","place":"VALLEE DES EAUX CLAIRES - ENTRE COMBE DE LOUP ET BOISSIERE","lat":45.5950821,"lon":0.2077267,"depth":6.2,"altitude":95.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0519/S\" ;\"07097X0519\")","embedded":true,"imported":true},{"id":"BSS001UDAP","indice":"07097X0520","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - ENTRE COMBE DE LOUP ET BOISSIERE","lat":45.600703,"lon":0.2102032,"depth":3.8,"altitude":98.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0520/S\" ;\"07097X0520\")","embedded":true,"imported":true},{"id":"BSS001UDAQ","indice":"07097X0521","name":"S","designation":"S","commune":"DIRAC","place":"VALLEE DES EAUX CLAIRES - ENTRE COMBE DE LOUP ET BOISSIERE","lat":45.5969542,"lon":0.211637,"depth":4.5,"altitude":96.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0521/S\" ;\"07097X0521\")","embedded":true,"imported":true},{"id":"BSS001UDAR","indice":"07097X0522","name":"S","designation":"S","commune":"TORSAC","place":"VALLEE DES EAUX CLAIRES - ENYTRE COMBE DE LOUP ET BOISSIERE","lat":45.5936096,"lon":0.2061196,"depth":3.0,"altitude":94.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0522/S\" ;\"07097X0522\")","embedded":true,"imported":true},{"id":"BSS001UDAS","indice":"07097X0523","name":"S","designation":"S","commune":"DIRAC","place":"","lat":45.5948382,"lon":0.2091509,"depth":4.0,"altitude":96.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0523/S\" ;\"07097X0523\")","embedded":true,"imported":true},{"id":"BSS001UDAT","indice":"07097X0524","name":"S","designation":"S","commune":"DIRAC","place":"","lat":45.5984142,"lon":0.2174678,"depth":5.0,"altitude":99.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0524/S\" ;\"07097X0524\")","embedded":true,"imported":true},{"id":"BSS001UDAY","indice":"07097X0529","name":"CHEZ NAULET","designation":"F","commune":"TORSAC","place":"CHEZ NAULET","lat":45.5623177,"lon":0.2312855,"depth":97.0,"altitude":110.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0529/F\" ;\"07097X0529\")","embedded":true,"imported":true},{"id":"BSS001UDBA","indice":"07097X0531","name":"LES CHENEVEAUX","designation":"F","commune":"TORSAC","place":"LES CHENEVEAUX","lat":45.5581831,"lon":0.2316971,"depth":1.0,"altitude":110.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0531/F\" ;\"07097X0531\")","embedded":true,"imported":true},{"id":"BSS001UDBB","indice":"07097X0532","name":"SOURCE DU PONTREAU","designation":"F","commune":"TORSAC","place":"SOURCE DU PONTREAU","lat":45.5604915,"lon":0.2299401,"depth":null,"altitude":110.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0532/F\" ;\"07097X0532\")","embedded":true,"imported":true},{"id":"BSS001UDBE","indice":"07097X0535","name":"F","designation":"F","commune":"TORSAC","place":"LE GRAND CHAMOULARD","lat":45.5989542,"lon":0.1845044,"depth":null,"altitude":110.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0535/F\" ;\"07097X0535\")","embedded":true,"imported":true},{"id":"BSS001UDBF","indice":"07097X0536","name":"P","designation":"P","commune":"TORSAC","place":"LA FAYE","lat":45.5564265,"lon":0.1979121,"depth":24.5,"altitude":151.2,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0536/P\" ;\"07097X0536\")","embedded":true,"imported":true},{"id":"BSS001UDBG","indice":"07097X0537","name":"P","designation":"P","commune":"TORSAC","place":"MOULIN DE LA BOIS","lat":45.589331,"lon":0.2130729,"depth":17.0,"altitude":109.3,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0537/P\" ;\"07097X0537\")","embedded":true,"imported":true},{"id":"BSS001UDBH","indice":"07097X0538","name":"P","designation":"P","commune":"TORSAC","place":"CHEZ NAULET","lat":45.5534697,"lon":0.2298291,"depth":23.0,"altitude":110.0,"nature":"PUITS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0538/P\" ;\"07097X0538\")","embedded":true,"imported":true},{"id":"BSS001UDBL","indice":"07097X0541","name":"F","designation":"F","commune":"TORSAC","place":"CHEZ NAULET","lat":45.553497,"lon":0.2298406,"depth":80.0,"altitude":109.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0541/F\" ;\"07097X0541\")","embedded":true,"imported":true},{"id":"BSS001UDBN","indice":"07097X0543","name":"S","designation":"S","commune":"TORSAC","place":"LE GORGEAU","lat":45.5640402,"lon":0.2262352,"depth":null,"altitude":107.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0543/S\" ;\"07097X0543\")","embedded":true,"imported":true},{"id":"BSS001UDBP","indice":"07097X0544","name":"S","designation":"S","commune":"TORSAC","place":"FONTAINE LA MARTHE","lat":45.5654533,"lon":0.2112458,"depth":null,"altitude":104.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0544/S\" ;\"07097X0544\")","embedded":true,"imported":true},{"id":"BSS001UDBQ","indice":"07097X0545","name":"S","designation":"S","commune":"TORSAC","place":"LE BOISSEAU","lat":45.5694583,"lon":0.1933277,"depth":null,"altitude":90.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0545/S\" ;\"07097X0545\")","embedded":true,"imported":true},{"id":"BSS001UDBR","indice":"07097X0546","name":"S","designation":"S","commune":"TORSAC","place":"LE BOISSEAU","lat":45.5699427,"lon":0.1932391,"depth":null,"altitude":90.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0546/S\" ;\"07097X0546\")","embedded":true,"imported":true},{"id":"BSS001UDBS","indice":"07097X0547","name":"S","designation":"S","commune":"TORSAC","place":"LA PETITE ANDOLE","lat":45.5716731,"lon":0.1928949,"depth":null,"altitude":89.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0547/S\" ;\"07097X0547\")","embedded":true,"imported":true},{"id":"BSS001UDBT","indice":"07097X0548","name":"S","designation":"S","commune":"TORSAC","place":"LA PETITE COURRIERE","lat":45.5754528,"lon":0.2337727,"depth":null,"altitude":125.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0548/S\" ;\"07097X0548\")","embedded":true,"imported":true},{"id":"BSS001UDBU","indice":"07097X0549","name":"S","designation":"S","commune":"TORSAC","place":"CHEZ PASQUET","lat":45.5776561,"lon":0.1795814,"depth":null,"altitude":82.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0549/S\" ;\"07097X0549\")","embedded":true,"imported":true},{"id":"BSS001UDBV","indice":"07097X0550","name":"S","designation":"S","commune":"DIRAC","place":"LA PREVALERIE","lat":45.5834926,"lon":0.2269298,"depth":null,"altitude":110.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0550/S\" ;\"07097X0550\")","embedded":true,"imported":true},{"id":"BSS001UDBW","indice":"07097X0551","name":"S","designation":"S","commune":"DIRAC","place":"LA PREVALERIE","lat":45.5844446,"lon":0.2235202,"depth":null,"altitude":107.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0551/S\" ;\"07097X0551\")","embedded":true,"imported":true},{"id":"BSS001UDBX","indice":"07097X0552","name":"S","designation":"S","commune":"TORSAC","place":"CHEZ GORY","lat":45.5939325,"lon":0.2064242,"depth":null,"altitude":94.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0552/S\" ;\"07097X0552\")","embedded":true,"imported":true},{"id":"BSS001UDBY","indice":"07097X0553","name":"S","designation":"S","commune":"TORSAC","place":"LA TURBINE","lat":45.5958429,"lon":0.1977413,"depth":null,"altitude":90.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0553/S\" ;\"07097X0553\")","embedded":true,"imported":true},{"id":"BSS001UDBZ","indice":"07097X0554","name":"S","designation":"S","commune":"DIRAC","place":"COMBE DE LOUP","lat":45.5989121,"lon":0.1936327,"depth":null,"altitude":83.0,"nature":"ouvrage BSS","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0554/S\" ;\"07097X0554\")","embedded":true,"imported":true},{"id":"BSS001UDCA","indice":"07097X0555","name":"S","designation":"S","commune":"PUYMOYEN","place":"LE PETIT CHAMOULARD","lat":45.6017491,"lon":0.1827707,"depth":null,"altitude":78.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0555/S\" ;\"07097X0555\")","embedded":true,"imported":true},{"id":"BSS001UDCB","indice":"07097X0556","name":"S","designation":"S","commune":"DIRAC","place":"LE MAINE PREVOT","lat":45.6021851,"lon":0.190476,"depth":null,"altitude":85.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0556/S\" ;\"07097X0556\")","embedded":true,"imported":true},{"id":"BSS001UDCC","indice":"07097X0557","name":"S","designation":"S","commune":"DIRAC","place":"LE FOUR A CHAUX","lat":45.6037428,"lon":0.1886256,"depth":null,"altitude":83.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0557/S\" ;\"07097X0557\")","embedded":true,"imported":true},{"id":"BSS001UDCD","indice":"07097X0558","name":"S","designation":"S","commune":"DIRAC","place":"SAUVIGNAC","lat":45.5990795,"lon":0.2279852,"depth":null,"altitude":144.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0558/S\" ;\"07097X0558\")","embedded":true,"imported":true},{"id":"BSS001UDCM","indice":"07097X0566","name":"SCE","designation":"SCE","commune":"TORSAC","place":"LES CHENEVAUX","lat":45.5582148,"lon":0.2311568,"depth":null,"altitude":108.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0566/SCE\" ;\"07097X0566\")","embedded":true,"imported":true},{"id":"BSS001UDCN","indice":"07097X0567","name":"SCE","designation":"SCE","commune":"TORSAC","place":"SOURCE LE PONTREAU","lat":45.5604601,"lon":0.2297621,"depth":null,"altitude":109.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0567/SCE\" ;\"07097X0567\")","embedded":true,"imported":true},{"id":"BSS001UDCP","indice":"07097X0568","name":"SCE","designation":"SCE","commune":"TORSAC","place":"FONTAINE DES GARANDS","lat":45.5622171,"lon":0.2326886,"depth":null,"altitude":110.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0568/SCE\" ;\"07097X0568\")","embedded":true,"imported":true},{"id":"BSS001UDCR","indice":"07097X0570","name":"FO","designation":"FO","commune":"TORSAC","place":"FONTAINE DE LA GARENNE","lat":45.5702981,"lon":0.2129521,"depth":null,"altitude":119.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0570/FO\" ;\"07097X0570\")","embedded":true,"imported":true},{"id":"BSS001UDCS","indice":"07097X0571","name":"FO","designation":"FO","commune":"TORSAC","place":"FONTAINE DE CHEZ MERIOT","lat":45.5629629,"lon":0.2220177,"depth":null,"altitude":105.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0571/FO\" ;\"07097X0571\")","embedded":true,"imported":true},{"id":"BSS001UDCT","indice":"07097X0572","name":"F","designation":"F","commune":"PUYMOYEN","place":"RUE DES COLLETYS","lat":45.6194058,"lon":0.1836959,"depth":20.0,"altitude":138.0,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0572/F\" ;\"07097X0572\")","embedded":true,"imported":true},{"id":"BSS001UDCU","indice":"07097X0573","name":"FONT","designation":"FONT","commune":"DIRAC","place":"Frégeneuil","lat":45.5976504,"lon":0.2208305,"depth":null,"altitude":110.0,"nature":"SOURCE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=07097X0573/FONT\" ;\"07097X0573\")","embedded":true,"imported":true},{"id":"BSS003XDLQ","indice":"BSS003XDLQ","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6311179,"lon":0.0627689,"depth":20.0,"altitude":38.65,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS003XDLQ/X\" ;\"BSS003XDLQ\")","embedded":true,"imported":true},{"id":"BSS003XDMK","indice":"BSS003XDMK","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.631042,"lon":0.0633124,"depth":20.0,"altitude":39.52,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS003XDMK/X\" ;\"BSS003XDMK\")","embedded":true,"imported":true},{"id":"BSS003XDNE","indice":"BSS003XDNE","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6308976,"lon":0.0626136,"depth":20.0,"altitude":null,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS003XDNE/X\" ;\"BSS003XDNE\")","embedded":true,"imported":true},{"id":"BSS004KBQZ","indice":"BSS004KBQZ","name":"PIÉZOMÈTRE","designation":"X","commune":"ANGOULEME","place":"IMPASSE DE LA LOIRE","lat":45.6422792,"lon":0.1659355,"depth":10.0,"altitude":51.11,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004KBQZ/X\" ;\"BSS004KBQZ\")","embedded":true,"imported":true},{"id":"BSS004KBTP","indice":"BSS004KBTP","name":"PIÉZOMÈTRE","designation":"X","commune":"ANGOULEME","place":"IMPASSE DE LA LOIRE","lat":45.6423919,"lon":0.1654031,"depth":10.0,"altitude":49.88,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004KBTP/X\" ;\"BSS004KBTP\")","embedded":true,"imported":true},{"id":"BSS004KWFM","indice":"BSS004KWFM","name":"FORAGE D'EAU","designation":"X","commune":"VOEUIL ET GIGET","place":"19 Rue de Bompart","lat":45.5994307,"lon":0.1444448,"depth":167.0,"altitude":62.92,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004KWFM/X\" ;\"BSS004KWFM\")","embedded":true,"imported":true},{"id":"BSS004LNSQ","indice":"BSS004LNSQ","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6406369,"lon":0.0704982,"depth":15.3,"altitude":25.62,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNSQ/X\" ;\"BSS004LNSQ\")","embedded":true,"imported":true},{"id":"BSS004LNSR","indice":"BSS004LNSR","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6397817,"lon":0.0705306,"depth":15.1,"altitude":25.79,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNSR/X\" ;\"BSS004LNSR\")","embedded":true,"imported":true},{"id":"BSS004LNSS","indice":"BSS004LNSS","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6409701,"lon":0.0704934,"depth":15.3,"altitude":25.58,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNSS/X\" ;\"BSS004LNSS\")","embedded":true,"imported":true},{"id":"BSS004LNST","indice":"BSS004LNST","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6411065,"lon":0.0705376,"depth":15.3,"altitude":25.62,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNST/X\" ;\"BSS004LNST\")","embedded":true,"imported":true},{"id":"BSS004LNTG","indice":"BSS004LNTG","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6407722,"lon":0.0705039,"depth":15.3,"altitude":25.56,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNTG/X\" ;\"BSS004LNTG\")","embedded":true,"imported":true},{"id":"BSS004LNTJ","indice":"BSS004LNTJ","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6410971,"lon":0.0705253,"depth":15.5,"altitude":25.62,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNTJ/X\" ;\"BSS004LNTJ\")","embedded":true,"imported":true},{"id":"BSS004LNTL","indice":"BSS004LNTL","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6412911,"lon":0.0707077,"depth":3.78,"altitude":25.2,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNTL/X\" ;\"BSS004LNTL\")","embedded":true,"imported":true},{"id":"BSS004LNTM","indice":"BSS004LNTM","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6413134,"lon":0.0705267,"depth":6.25,"altitude":25.36,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNTM/X\" ;\"BSS004LNTM\")","embedded":true,"imported":true},{"id":"BSS004LNTU","indice":"BSS004LNTU","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6413081,"lon":0.0703214,"depth":3.78,"altitude":25.38,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNTU/X\" ;\"BSS004LNTU\")","embedded":true,"imported":true},{"id":"BSS004LNTZ","indice":"BSS004LNTZ","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6417647,"lon":0.0705542,"depth":1.0,"altitude":25.18,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNTZ/X\" ;\"BSS004LNTZ\")","embedded":true,"imported":true},{"id":"BSS004LNUA","indice":"BSS004LNUA","name":"X","designation":"X","commune":"LINARS","place":"PORT BOUNINE","lat":45.6417564,"lon":0.0705803,"depth":10.0,"altitude":25.18,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNUA/X\" ;\"BSS004LNUA\")","embedded":true,"imported":true},{"id":"BSS004LNUC","indice":"BSS004LNUC","name":"X","designation":"X","commune":"LINARS","place":"PORT BOUNINE","lat":45.642035,"lon":0.0705527,"depth":4.04,"altitude":26.2,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNUC/X\" ;\"BSS004LNUC\")","embedded":true,"imported":true},{"id":"BSS004LNUD","indice":"BSS004LNUD","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.642036,"lon":0.0705912,"depth":3.8,"altitude":26.11,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LNUD/X\" ;\"BSS004LNUD\")","embedded":true,"imported":true},{"id":"BSS004LUGE","indice":"BSS004LUGE","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.641885,"lon":0.0703294,"depth":10.0,"altitude":25.79,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LUGE/X\" ;\"BSS004LUGE\")","embedded":true,"imported":true},{"id":"BSS004LURL","indice":"BSS004LURL","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6424066,"lon":0.070289,"depth":16.0,"altitude":29.83,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LURL/X\" ;\"BSS004LURL\")","embedded":true,"imported":true},{"id":"BSS004LUVL","indice":"BSS004LUVL","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6418133,"lon":0.0703461,"depth":16.0,"altitude":25.37,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LUVL/X\" ;\"BSS004LUVL\")","embedded":true,"imported":true},{"id":"BSS004LUXX","indice":"BSS004LUXX","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6413661,"lon":0.0704725,"depth":16.0,"altitude":25.42,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LUXX/X\" ;\"BSS004LUXX\")","embedded":true,"imported":true},{"id":"BSS004LVLM","indice":"BSS004LVLM","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.642041,"lon":0.0707836,"depth":11.1,"altitude":26.13,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVLM/X\" ;\"BSS004LVLM\")","embedded":true,"imported":true},{"id":"BSS004LVLN","indice":"BSS004LVLN","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6402736,"lon":0.070389,"depth":24.04,"altitude":24.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVLN/X\" ;\"BSS004LVLN\")","embedded":true,"imported":true},{"id":"BSS004LVLV","indice":"BSS004LVLV","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6402909,"lon":0.0703624,"depth":18.3,"altitude":24.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVLV/X\" ;\"BSS004LVLV\")","embedded":true,"imported":true},{"id":"BSS004LVLW","indice":"BSS004LVLW","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6403202,"lon":0.0704508,"depth":23.1,"altitude":24.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVLW/X\" ;\"BSS004LVLW\")","embedded":true,"imported":true},{"id":"BSS004LVLX","indice":"BSS004LVLX","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6402303,"lon":0.0704555,"depth":23.23,"altitude":24.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVLX/X\" ;\"BSS004LVLX\")","embedded":true,"imported":true},{"id":"BSS004LVLZ","indice":"BSS004LVLZ","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6403169,"lon":0.0703225,"depth":22.96,"altitude":24.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVLZ/X\" ;\"BSS004LVLZ\")","embedded":true,"imported":true},{"id":"BSS004LVNU","indice":"BSS004LVNU","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6402359,"lon":0.0703268,"depth":23.21,"altitude":24.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LVNU/X\" ;\"BSS004LVNU\")","embedded":true,"imported":true},{"id":"BSS004LZFP","indice":"BSS004LZFP","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6416927,"lon":0.0702111,"depth":4.6,"altitude":25.02,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LZFP/X\" ;\"BSS004LZFP\")","embedded":true,"imported":true},{"id":"BSS004LZFQ","indice":"BSS004LZFQ","name":"PR2051BXBIS","designation":"X","commune":"LINARS","place":"","lat":45.641693,"lon":0.070224,"depth":4.1,"altitude":25.05,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LZFQ/X\" ;\"BSS004LZFQ\")","embedded":true,"imported":true},{"id":"BSS004LZFS","indice":"BSS004LZFS","name":"X","designation":"X","commune":"LINARS","place":"","lat":45.6424136,"lon":0.0702115,"depth":7.0,"altitude":30.01,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004LZFS/X\" ;\"BSS004LZFS\")","embedded":true,"imported":true},{"id":"BSS004MBEF","indice":"BSS004MBEF","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.6382639,"lon":0.1333476,"depth":12.0,"altitude":51.43,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEF/X\" ;\"BSS004MBEF\")","embedded":true,"imported":true},{"id":"BSS004MBEG","indice":"BSS004MBEG","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.637095,"lon":0.1320337,"depth":11.5,"altitude":50.94,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEG/X\" ;\"BSS004MBEG\")","embedded":true,"imported":true},{"id":"BSS004MBEH","indice":"BSS004MBEH","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6367223,"lon":0.1322585,"depth":12.0,"altitude":52.3,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEH/X\" ;\"BSS004MBEH\")","embedded":true,"imported":true},{"id":"BSS004MBEJ","indice":"BSS004MBEJ","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6369111,"lon":0.1318891,"depth":12.0,"altitude":51.19,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEJ/X\" ;\"BSS004MBEJ\")","embedded":true,"imported":true},{"id":"BSS004MBEK","indice":"BSS004MBEK","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6366578,"lon":0.1318508,"depth":22.5,"altitude":50.91,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEK/X\" ;\"BSS004MBEK\")","embedded":true,"imported":true},{"id":"BSS004MBEL","indice":"BSS004MBEL","name":"X","designation":"X","commune":"ANGOULEME","place":"3 Rue de Rabion","lat":45.636497,"lon":0.1294315,"depth":11.5,"altitude":45.76,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEL/X\" ;\"BSS004MBEL\")","embedded":true,"imported":true},{"id":"BSS004MBEM","indice":"BSS004MBEM","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6360206,"lon":0.1312416,"depth":11.5,"altitude":49.86,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEM/X\" ;\"BSS004MBEM\")","embedded":true,"imported":true},{"id":"BSS004MBEN","indice":"BSS004MBEN","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.6374995,"lon":0.1330532,"depth":17.0,"altitude":54.12,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEN/X\" ;\"BSS004MBEN\")","embedded":true,"imported":true},{"id":"BSS004MBEP","indice":"BSS004MBEP","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.6377759,"lon":0.1340023,"depth":12.0,"altitude":59.45,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEP/X\" ;\"BSS004MBEP\")","embedded":true,"imported":true},{"id":"BSS004MBEQ","indice":"BSS004MBEQ","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.6381343,"lon":0.133213,"depth":12.0,"altitude":52.17,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEQ/X\" ;\"BSS004MBEQ\")","embedded":true,"imported":true},{"id":"BSS004MBER","indice":"BSS004MBER","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.638071,"lon":0.1332035,"depth":14.0,"altitude":52.17,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBER/X\" ;\"BSS004MBER\")","embedded":true,"imported":true},{"id":"BSS004MBES","indice":"BSS004MBES","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.6383357,"lon":0.1329842,"depth":13.0,"altitude":51.58,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBES/X\" ;\"BSS004MBES\")","embedded":true,"imported":true},{"id":"BSS004MBET","indice":"BSS004MBET","name":"X","designation":"X","commune":"ANGOULEME","place":"13 Rue de la Brigade Rac","lat":45.6391133,"lon":0.1348579,"depth":12.0,"altitude":54.84,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBET/X\" ;\"BSS004MBET\")","embedded":true,"imported":true},{"id":"BSS004MBEU","indice":"BSS004MBEU","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.6379257,"lon":0.1331596,"depth":12.0,"altitude":51.87,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEU/X\" ;\"BSS004MBEU\")","embedded":true,"imported":true},{"id":"BSS004MBEV","indice":"BSS004MBEV","name":"X","designation":"X","commune":"ANGOULEME","place":"19 Rue de la Brigade Rac","lat":45.637211,"lon":0.1326956,"depth":17.0,"altitude":52.97,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEV/X\" ;\"BSS004MBEV\")","embedded":true,"imported":true},{"id":"BSS004MBEW","indice":"BSS004MBEW","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6371081,"lon":0.1325468,"depth":17.0,"altitude":52.73,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEW/X\" ;\"BSS004MBEW\")","embedded":true,"imported":true},{"id":"BSS004MBEX","indice":"BSS004MBEX","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6370096,"lon":0.1329244,"depth":15.5,"altitude":55.24,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEX/X\" ;\"BSS004MBEX\")","embedded":true,"imported":true},{"id":"BSS004MBEY","indice":"BSS004MBEY","name":"X","designation":"X","commune":"ANGOULEME","place":"31 Rue de la Brigade Rac","lat":45.6370031,"lon":0.1326679,"depth":12.0,"altitude":54.65,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBEY/X\" ;\"BSS004MBEY\")","embedded":true,"imported":true},{"id":"BSS004MBXJ","indice":"BSS004MBXJ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5988317,"lon":0.0985225,"depth":14.75,"altitude":60.36,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBXJ/X\" ;\"BSS004MBXJ\")","embedded":true,"imported":true},{"id":"BSS004MBXZ","indice":"BSS004MBXZ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5986045,"lon":0.0980979,"depth":20.0,"altitude":61.86,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBXZ/X\" ;\"BSS004MBXZ\")","embedded":true,"imported":true},{"id":"BSS004MBYA","indice":"BSS004MBYA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5982412,"lon":0.0979886,"depth":20.5,"altitude":61.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBYA/X\" ;\"BSS004MBYA\")","embedded":true,"imported":true},{"id":"BSS004MBYB","indice":"BSS004MBYB","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6003023,"lon":0.0992926,"depth":19.4,"altitude":60.94,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBYB/X\" ;\"BSS004MBYB\")","embedded":true,"imported":true},{"id":"BSS004MBYE","indice":"BSS004MBYE","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6001207,"lon":0.099238,"depth":15.0,"altitude":63.34,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBYE/X\" ;\"BSS004MBYE\")","embedded":true,"imported":true},{"id":"BSS004MBZZ","indice":"BSS004MBZZ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5999824,"lon":0.0991169,"depth":15.0,"altitude":61.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MBZZ/X\" ;\"BSS004MBZZ\")","embedded":true,"imported":true},{"id":"BSS004MCAA","indice":"BSS004MCAA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5974601,"lon":0.0974005,"depth":16.5,"altitude":62.22,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAA/X\" ;\"BSS004MCAA\")","embedded":true,"imported":true},{"id":"BSS004MCAD","indice":"BSS004MCAD","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5995741,"lon":0.0990099,"depth":20.0,"altitude":67.94,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAD/X\" ;\"BSS004MCAD\")","embedded":true,"imported":true},{"id":"BSS004MCAE","indice":"BSS004MCAE","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5994495,"lon":0.0990677,"depth":20.0,"altitude":68.74,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAE/X\" ;\"BSS004MCAE\")","embedded":true,"imported":true},{"id":"BSS004MCAH","indice":"BSS004MCAH","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5992279,"lon":0.0988611,"depth":15.4,"altitude":67.39,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAH/X\" ;\"BSS004MCAH\")","embedded":true,"imported":true},{"id":"BSS004MCAJ","indice":"BSS004MCAJ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5991826,"lon":0.0988507,"depth":20.0,"altitude":67.54,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAJ/X\" ;\"BSS004MCAJ\")","embedded":true,"imported":true},{"id":"BSS004MCAK","indice":"BSS004MCAK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5969994,"lon":0.0980536,"depth":15.3,"altitude":61.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAK/X\" ;\"BSS004MCAK\")","embedded":true,"imported":true},{"id":"BSS004MCAN","indice":"BSS004MCAN","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5970345,"lon":0.0973201,"depth":20.0,"altitude":60.86,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAN/X\" ;\"BSS004MCAN\")","embedded":true,"imported":true},{"id":"BSS004MCAP","indice":"BSS004MCAP","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5969442,"lon":0.097312,"depth":15.0,"altitude":60.65,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAP/X\" ;\"BSS004MCAP\")","embedded":true,"imported":true},{"id":"BSS004MCAS","indice":"BSS004MCAS","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.598882,"lon":0.0987252,"depth":15.5,"altitude":61.59,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCAS/X\" ;\"BSS004MCAS\")","embedded":true,"imported":true},{"id":"BSS004MCEB","indice":"BSS004MCEB","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.596552,"lon":0.0971272,"depth":20.0,"altitude":61.1,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCEB/X\" ;\"BSS004MCEB\")","embedded":true,"imported":true},{"id":"BSS004MCEU","indice":"BSS004MCEU","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6067936,"lon":0.1025731,"depth":15.0,"altitude":57.14,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MCEU/X\" ;\"BSS004MCEU\")","embedded":true,"imported":true},{"id":"BSS004MDQP","indice":"BSS004MDQP","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5961694,"lon":0.0969676,"depth":15.15,"altitude":61.06,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDQP/X\" ;\"BSS004MDQP\")","embedded":true,"imported":true},{"id":"BSS004MDRJ","indice":"BSS004MDRJ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5982908,"lon":0.0985123,"depth":20.0,"altitude":60.21,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDRJ/X\" ;\"BSS004MDRJ\")","embedded":true,"imported":true},{"id":"BSS004MDRK","indice":"BSS004MDRK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5978891,"lon":0.0986617,"depth":20.0,"altitude":62.85,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDRK/X\" ;\"BSS004MDRK\")","embedded":true,"imported":true},{"id":"BSS004MDRN","indice":"BSS004MDRN","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5958645,"lon":0.0966755,"depth":15.0,"altitude":61.48,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDRN/X\" ;\"BSS004MDRN\")","embedded":true,"imported":true},{"id":"BSS004MDRR","indice":"BSS004MDRR","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5982772,"lon":0.0979867,"depth":15.0,"altitude":61.53,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDRR/X\" ;\"BSS004MDRR\")","embedded":true,"imported":true},{"id":"BSS004MDRS","indice":"BSS004MDRS","name":"PZ","designation":"X","commune":"COURONNE","place":"","lat":45.5957875,"lon":0.096487,"depth":15.0,"altitude":62.16,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDRS/X\" ;\"BSS004MDRS\")","embedded":true,"imported":true},{"id":"BSS004MDRV","indice":"BSS004MDRV","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5977618,"lon":0.098617,"depth":3.65,"altitude":62.87,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDRV/X\" ;\"BSS004MDRV\")","embedded":true,"imported":true},{"id":"BSS004MDSQ","indice":"BSS004MDSQ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5955006,"lon":0.0965405,"depth":1.1,"altitude":61.62,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDSQ/X\" ;\"BSS004MDSQ\")","embedded":true,"imported":true},{"id":"BSS004MDTD","indice":"BSS004MDTD","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5975073,"lon":0.0981811,"depth":15.1,"altitude":60.46,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDTD/X\" ;\"BSS004MDTD\")","embedded":true,"imported":true},{"id":"BSS004MDUU","indice":"BSS004MDUU","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5951206,"lon":0.0964834,"depth":15.4,"altitude":62.38,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDUU/X\" ;\"BSS004MDUU\")","embedded":true,"imported":true},{"id":"BSS004MDZX","indice":"BSS004MDZX","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.59728,"lon":0.0981031,"depth":2.35,"altitude":60.93,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MDZX/X\" ;\"BSS004MDZX\")","embedded":true,"imported":true},{"id":"BSS004MEAC","indice":"BSS004MEAC","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5972844,"lon":0.0979232,"depth":15.0,"altitude":60.97,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEAC/X\" ;\"BSS004MEAC\")","embedded":true,"imported":true},{"id":"BSS004MEER","indice":"BSS004MEER","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5943782,"lon":0.0959961,"depth":4.3,"altitude":61.46,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEER/X\" ;\"BSS004MEER\")","embedded":true,"imported":true},{"id":"BSS004MEES","indice":"BSS004MEES","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5960053,"lon":0.0975923,"depth":1.6,"altitude":63.25,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEES/X\" ;\"BSS004MEES\")","embedded":true,"imported":true},{"id":"BSS004MEET","indice":"BSS004MEET","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5939478,"lon":0.0964294,"depth":4.2,"altitude":62.48,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEET/X\" ;\"BSS004MEET\")","embedded":true,"imported":true},{"id":"BSS004MEFJ","indice":"BSS004MEFJ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5918832,"lon":0.093945,"depth":4.2,"altitude":65.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEFJ/X\" ;\"BSS004MEFJ\")","embedded":true,"imported":true},{"id":"BSS004MEFK","indice":"BSS004MEFK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5907671,"lon":0.0915521,"depth":25.03,"altitude":57.8,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEFK/X\" ;\"BSS004MEFK\")","embedded":true,"imported":true},{"id":"BSS004MEFL","indice":"BSS004MEFL","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5906521,"lon":0.0912886,"depth":25.0,"altitude":57.45,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEFL/X\" ;\"BSS004MEFL\")","embedded":true,"imported":true},{"id":"BSS004MEHD","indice":"BSS004MEHD","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5902489,"lon":0.0910274,"depth":5.0,"altitude":58.09,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEHD/X\" ;\"BSS004MEHD\")","embedded":true,"imported":true},{"id":"BSS004MEJL","indice":"BSS004MEJL","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5904399,"lon":0.0907479,"depth":25.12,"altitude":56.88,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEJL/X\" ;\"BSS004MEJL\")","embedded":true,"imported":true},{"id":"BSS004MEJT","indice":"BSS004MEJT","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5900507,"lon":0.0896389,"depth":25.15,"altitude":56.59,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEJT/X\" ;\"BSS004MEJT\")","embedded":true,"imported":true},{"id":"BSS004MELE","indice":"BSS004MELE","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5896703,"lon":0.0885167,"depth":25.04,"altitude":55.79,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MELE/X\" ;\"BSS004MELE\")","embedded":true,"imported":true},{"id":"BSS004MELP","indice":"BSS004MELP","name":"CPS2396_RC1","designation":"X","commune":"COURONNE","place":"","lat":45.5891548,"lon":0.0874015,"depth":14.8,"altitude":54.99,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MELP/X\" ;\"BSS004MELP\")","embedded":true,"imported":true},{"id":"BSS004MELS","indice":"BSS004MELS","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5892431,"lon":0.0873327,"depth":16.08,"altitude":54.79,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MELS/X\" ;\"BSS004MELS\")","embedded":true,"imported":true},{"id":"BSS004MELZ","indice":"BSS004MELZ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5891701,"lon":0.087298,"depth":5.0,"altitude":54.93,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MELZ/X\" ;\"BSS004MELZ\")","embedded":true,"imported":true},{"id":"BSS004MEMA","indice":"BSS004MEMA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5889196,"lon":0.086323,"depth":25.05,"altitude":54.96,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMA/X\" ;\"BSS004MEMA\")","embedded":true,"imported":true},{"id":"BSS004MEMD","indice":"BSS004MEMD","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5885394,"lon":0.0852136,"depth":24.6,"altitude":57.65,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMD/X\" ;\"BSS004MEMD\")","embedded":true,"imported":true},{"id":"BSS004MEME","indice":"BSS004MEME","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5883451,"lon":0.0846719,"depth":25.0,"altitude":56.36,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEME/X\" ;\"BSS004MEME\")","embedded":true,"imported":true},{"id":"BSS004MEMR","indice":"BSS004MEMR","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5881595,"lon":0.084117,"depth":25.1,"altitude":57.3,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMR/X\" ;\"BSS004MEMR\")","embedded":true,"imported":true},{"id":"BSS004MEMS","indice":"BSS004MEMS","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Moulin de Ventuzeau","lat":45.5880336,"lon":0.0837771,"depth":7.46,"altitude":57.66,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMS/X\" ;\"BSS004MEMS\")","embedded":true,"imported":true},{"id":"BSS004MEMT","indice":"BSS004MEMT","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Moulin de Ventuzeau","lat":45.5879899,"lon":0.0838308,"depth":5.0,"altitude":57.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMT/X\" ;\"BSS004MEMT\")","embedded":true,"imported":true},{"id":"BSS004MEMU","indice":"BSS004MEMU","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.587814,"lon":0.083301,"depth":15.0,"altitude":59.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMU/X\" ;\"BSS004MEMU\")","embedded":true,"imported":true},{"id":"BSS004MEMX","indice":"BSS004MEMX","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5879293,"lon":0.0832308,"depth":15.02,"altitude":59.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEMX/X\" ;\"BSS004MEMX\")","embedded":true,"imported":true},{"id":"BSS004MENG","indice":"BSS004MENG","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.586714,"lon":0.079804,"depth":20.12,"altitude":59.54,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MENG/X\" ;\"BSS004MENG\")","embedded":true,"imported":true},{"id":"BSS004MENV","indice":"BSS004MENV","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5873168,"lon":0.0815048,"depth":15.0,"altitude":58.87,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MENV/X\" ;\"BSS004MENV\")","embedded":true,"imported":true},{"id":"BSS004MEPC","indice":"BSS004MEPC","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5872188,"lon":0.0815485,"depth":20.17,"altitude":58.59,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEPC/X\" ;\"BSS004MEPC\")","embedded":true,"imported":true},{"id":"BSS004MEPX","indice":"BSS004MEPX","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5860924,"lon":0.0780786,"depth":15.0,"altitude":58.93,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEPX/X\" ;\"BSS004MEPX\")","embedded":true,"imported":true},{"id":"BSS004MERC","indice":"BSS004MERC","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5858608,"lon":0.0774876,"depth":2.95,"altitude":59.13,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MERC/X\" ;\"BSS004MERC\")","embedded":true,"imported":true},{"id":"BSS004MERF","indice":"BSS004MERF","name":"PS24188_RC1","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LES VARENNES","lat":45.5868356,"lon":0.0803238,"depth":8.12,"altitude":59.37,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MERF/X\" ;\"BSS004MERF\")","embedded":true,"imported":true},{"id":"BSS004MERJ","indice":"BSS004MERJ","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Moulin de Mentuzeau","lat":45.5867733,"lon":0.0803527,"depth":4.5,"altitude":59.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MERJ/X\" ;\"BSS004MERJ\")","embedded":true,"imported":true},{"id":"BSS004MERK","indice":"BSS004MERK","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LES VARENNES","lat":45.5856088,"lon":0.0768079,"depth":2.3,"altitude":58.51,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MERK/X\" ;\"BSS004MERK\")","embedded":true,"imported":true},{"id":"BSS004MESS","indice":"BSS004MESS","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LES VARENNES","lat":45.5856722,"lon":0.0768174,"depth":2.25,"altitude":57.78,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MESS/X\" ;\"BSS004MESS\")","embedded":true,"imported":true},{"id":"BSS004MEST","indice":"BSS004MEST","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5866343,"lon":0.0798595,"depth":16.5,"altitude":59.79,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEST/X\" ;\"BSS004MEST\")","embedded":true,"imported":true},{"id":"BSS004MESU","indice":"BSS004MESU","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5853819,"lon":0.0763964,"depth":2.0,"altitude":57.76,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MESU/X\" ;\"BSS004MESU\")","embedded":true,"imported":true},{"id":"BSS004MEZH","indice":"BSS004MEZH","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5848936,"lon":0.0766788,"depth":1.0,"altitude":57.91,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEZH/X\" ;\"BSS004MEZH\")","embedded":true,"imported":true},{"id":"BSS004MEZJ","indice":"BSS004MEZJ","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5859594,"lon":0.0781626,"depth":15.2,"altitude":59.45,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEZJ/X\" ;\"BSS004MEZJ\")","embedded":true,"imported":true},{"id":"BSS004MEZK","indice":"BSS004MEZK","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5845453,"lon":0.0747209,"depth":4.5,"altitude":57.9,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEZK/X\" ;\"BSS004MEZK\")","embedded":true,"imported":true},{"id":"BSS004MEZW","indice":"BSS004MEZW","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.584344,"lon":0.0742567,"depth":3.1,"altitude":57.57,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEZW/X\" ;\"BSS004MEZW\")","embedded":true,"imported":true},{"id":"BSS004MEZX","indice":"BSS004MEZX","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5854722,"lon":0.0770975,"depth":2.0,"altitude":59.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MEZX/X\" ;\"BSS004MEZX\")","embedded":true,"imported":true},{"id":"BSS004MFAA","indice":"BSS004MFAA","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5837404,"lon":0.0732234,"depth":1.1,"altitude":60.36,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFAA/X\" ;\"BSS004MFAA\")","embedded":true,"imported":true},{"id":"BSS004MFAF","indice":"BSS004MFAF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5849136,"lon":0.0760618,"depth":1.45,"altitude":59.29,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFAF/X\" ;\"BSS004MFAF\")","embedded":true,"imported":true},{"id":"BSS004MFAG","indice":"BSS004MFAG","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5843464,"lon":0.0750394,"depth":0.55,"altitude":59.37,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFAG/X\" ;\"BSS004MFAG\")","embedded":true,"imported":true},{"id":"BSS004MFAX","indice":"BSS004MFAX","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LES CHAUMES A GRIFFAUT","lat":45.5827835,"lon":0.0717726,"depth":4.0,"altitude":60.9,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFAX/X\" ;\"BSS004MFAX\")","embedded":true,"imported":true},{"id":"BSS004MFBA","indice":"BSS004MFBA","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5836724,"lon":0.074074,"depth":1.3,"altitude":60.32,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFBA/X\" ;\"BSS004MFBA\")","embedded":true,"imported":true},{"id":"BSS004MFEF","indice":"BSS004MFEF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.583223,"lon":0.0692726,"depth":2.0,"altitude":62.95,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFEF/X\" ;\"BSS004MFEF\")","embedded":true,"imported":true},{"id":"BSS004MFES","indice":"BSS004MFES","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5831918,"lon":0.0732652,"depth":0.9,"altitude":60.8,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFES/X\" ;\"BSS004MFES\")","embedded":true,"imported":true},{"id":"BSS004MFEV","indice":"BSS004MFEV","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Pré Caillet","lat":45.5806487,"lon":0.0690366,"depth":3.6,"altitude":62.27,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFEV/X\" ;\"BSS004MFEV\")","embedded":true,"imported":true},{"id":"BSS004MFFA","indice":"BSS004MFFA","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Pré Caillet","lat":45.581845,"lon":0.071373,"depth":2.5,"altitude":60.29,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFFA/X\" ;\"BSS004MFFA\")","embedded":true,"imported":true},{"id":"BSS004MFFH","indice":"BSS004MFFH","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Pré Caillet","lat":45.5787299,"lon":0.0673288,"depth":3.3,"altitude":72.48,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFFH/X\" ;\"BSS004MFFH\")","embedded":true,"imported":true},{"id":"BSS004MFFJ","indice":"BSS004MFFJ","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Pré Caillet","lat":45.5795682,"lon":0.0690681,"depth":3.3,"altitude":63.88,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MFFJ/X\" ;\"BSS004MFFJ\")","embedded":true,"imported":true},{"id":"BSS004MGLL","indice":"BSS004MGLL","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LA CABIROTTE","lat":45.5760868,"lon":0.0654926,"depth":2.5,"altitude":82.02,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGLL/X\" ;\"BSS004MGLL\")","embedded":true,"imported":true},{"id":"BSS004MGLM","indice":"BSS004MGLM","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Pré Caillet","lat":45.5772521,"lon":0.06733,"depth":3.7,"altitude":71.09,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGLM/X\" ;\"BSS004MGLM\")","embedded":true,"imported":true},{"id":"BSS004MGLN","indice":"BSS004MGLN","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5728791,"lon":0.0641228,"depth":4.7,"altitude":92.76,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGLN/X\" ;\"BSS004MGLN\")","embedded":true,"imported":true},{"id":"BSS004MGLR","indice":"BSS004MGLR","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5747663,"lon":0.0656524,"depth":2.8,"altitude":75.15,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGLR/X\" ;\"BSS004MGLR\")","embedded":true,"imported":true},{"id":"BSS004MGLS","indice":"BSS004MGLS","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LA VIGNE","lat":45.5709562,"lon":0.0653665,"depth":3.3,"altitude":91.42,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGLS/X\" ;\"BSS004MGLS\")","embedded":true,"imported":true},{"id":"BSS004MGMC","indice":"BSS004MGMC","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.639583,"lon":0.0705155,"depth":15.5,"altitude":25.94,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGMC/X\" ;\"BSS004MGMC\")","embedded":true,"imported":true},{"id":"BSS004MGMD","indice":"BSS004MGMD","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.6394474,"lon":0.0704969,"depth":15.2,"altitude":26.01,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGMD/X\" ;\"BSS004MGMD\")","embedded":true,"imported":true},{"id":"BSS004MGMM","indice":"BSS004MGMM","name":"X","designation":"X","commune":"NERSAC","place":"35 Rue Ampere","lat":45.6302502,"lon":0.0612865,"depth":19.0,"altitude":39.82,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGMM/X\" ;\"BSS004MGMM\")","embedded":true,"imported":true},{"id":"BSS004MGMN","indice":"BSS004MGMN","name":"X","designation":"X","commune":"NERSAC","place":"37 Rue Ampere","lat":45.6289994,"lon":0.0610061,"depth":21.0,"altitude":43.02,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGMN/X\" ;\"BSS004MGMN\")","embedded":true,"imported":true},{"id":"BSS004MGMP","indice":"BSS004MGMP","name":"X","designation":"X","commune":"NERSAC","place":"33 Rue du Peux","lat":45.6285569,"lon":0.0616589,"depth":21.0,"altitude":43.11,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGMP/X\" ;\"BSS004MGMP\")","embedded":true,"imported":true},{"id":"BSS004MGNE","indice":"BSS004MGNE","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.6393011,"lon":0.0707616,"depth":5.73,"altitude":25.8,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGNE/X\" ;\"BSS004MGNE\")","embedded":true,"imported":true},{"id":"BSS004MGNF","indice":"BSS004MGNF","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.6392887,"lon":0.070287,"depth":5.41,"altitude":25.96,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGNF/X\" ;\"BSS004MGNF\")","embedded":true,"imported":true},{"id":"BSS004MGPY","indice":"BSS004MGPY","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.6392937,"lon":0.0704794,"depth":6.08,"altitude":25.91,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGPY/X\" ;\"BSS004MGPY\")","embedded":true,"imported":true},{"id":"BSS004MGQQ","indice":"BSS004MGQQ","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6383925,"lon":0.0704757,"depth":3.78,"altitude":25.76,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGQQ/X\" ;\"BSS004MGQQ\")","embedded":true,"imported":true},{"id":"BSS004MGQR","indice":"BSS004MGQR","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.6384012,"lon":0.0704624,"depth":10.1,"altitude":25.75,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGQR/X\" ;\"BSS004MGQR\")","embedded":true,"imported":true},{"id":"BSS004MGQS","indice":"BSS004MGQS","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisdedeuil","lat":45.6383929,"lon":0.0704885,"depth":4.1,"altitude":25.76,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGQS/X\" ;\"BSS004MGQS\")","embedded":true,"imported":true},{"id":"BSS004MGQZ","indice":"BSS004MGQZ","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6383112,"lon":0.0704671,"depth":5.5,"altitude":25.67,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGQZ/X\" ;\"BSS004MGQZ\")","embedded":true,"imported":true},{"id":"BSS004MGRA","indice":"BSS004MGRA","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.637735,"lon":0.0704848,"depth":2.3,"altitude":25.95,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGRA/X\" ;\"BSS004MGRA\")","embedded":true,"imported":true},{"id":"BSS004MGRB","indice":"BSS004MGRB","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.637609,"lon":0.0704915,"depth":10.06,"altitude":25.91,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGRB/X\" ;\"BSS004MGRB\")","embedded":true,"imported":true},{"id":"BSS004MGRC","indice":"BSS004MGRC","name":"X","designation":"X","commune":"NERSAC","place":"La Rivière de Boisbeuil","lat":45.637546,"lon":0.0704948,"depth":4.18,"altitude":26.47,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGRC/X\" ;\"BSS004MGRC\")","embedded":true,"imported":true},{"id":"BSS004MGRE","indice":"BSS004MGRE","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6373207,"lon":0.0704939,"depth":10.03,"altitude":27.86,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGRE/X\" ;\"BSS004MGRE\")","embedded":true,"imported":true},{"id":"BSS004MGSC","indice":"BSS004MGSC","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6361076,"lon":0.067167,"depth":5.0,"altitude":38.9,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGSC/X\" ;\"BSS004MGSC\")","embedded":true,"imported":true},{"id":"BSS004MGSD","indice":"BSS004MGSD","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6359362,"lon":0.0706185,"depth":4.5,"altitude":38.05,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGSD/X\" ;\"BSS004MGSD\")","embedded":true,"imported":true},{"id":"BSS004MGSS","indice":"BSS004MGSS","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.637222,"lon":0.0705119,"depth":10.0,"altitude":28.94,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGSS/X\" ;\"BSS004MGSS\")","embedded":true,"imported":true},{"id":"BSS004MGUR","indice":"BSS004MGUR","name":"X","designation":"X","commune":"NERSAC","place":"Les Groles","lat":45.635292,"lon":0.0707939,"depth":2.1,"altitude":39.32,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGUR/X\" ;\"BSS004MGUR\")","embedded":true,"imported":true},{"id":"BSS004MGUS","indice":"BSS004MGUS","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6337189,"lon":0.0709413,"depth":2.0,"altitude":44.01,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGUS/X\" ;\"BSS004MGUS\")","embedded":true,"imported":true},{"id":"BSS004MGVP","indice":"BSS004MGVP","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6324883,"lon":0.0686688,"depth":4.5,"altitude":44.4,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGVP/X\" ;\"BSS004MGVP\")","embedded":true,"imported":true},{"id":"BSS004MGVQ","indice":"BSS004MGVQ","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6325431,"lon":0.0700787,"depth":4.0,"altitude":44.12,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGVQ/X\" ;\"BSS004MGVQ\")","embedded":true,"imported":true},{"id":"BSS004MGVR","indice":"BSS004MGVR","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6312333,"lon":0.0706489,"depth":4.0,"altitude":45.41,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGVR/X\" ;\"BSS004MGVR\")","embedded":true,"imported":true},{"id":"BSS004MGVS","indice":"BSS004MGVS","name":"X","designation":"X","commune":"NERSAC","place":"LA MALAUDRERIE","lat":45.6294586,"lon":0.0706658,"depth":3.5,"altitude":49.46,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGVS/X\" ;\"BSS004MGVS\")","embedded":true,"imported":true},{"id":"BSS004MGYT","indice":"BSS004MGYT","name":"X","designation":"X","commune":"NERSAC","place":"LA SERGENTE","lat":45.6275988,"lon":0.070533,"depth":15.0,"altitude":58.13,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGYT/X\" ;\"BSS004MGYT\")","embedded":true,"imported":true},{"id":"BSS004MGYU","indice":"BSS004MGYU","name":"X","designation":"X","commune":"NERSAC","place":"LA MALAUDRERIE","lat":45.628035,"lon":0.0692898,"depth":3.2,"altitude":59.25,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGYU/X\" ;\"BSS004MGYU\")","embedded":true,"imported":true},{"id":"BSS004MGYV","indice":"BSS004MGYV","name":"X","designation":"X","commune":"NERSAC","place":"LA MALAUDRERIE","lat":45.6276345,"lon":0.0705182,"depth":20.0,"altitude":58.13,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGYV/X\" ;\"BSS004MGYV\")","embedded":true,"imported":true},{"id":"BSS004MGYW","indice":"BSS004MGYW","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6269505,"lon":0.0684739,"depth":20.0,"altitude":68.57,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGYW/X\" ;\"BSS004MGYW\")","embedded":true,"imported":true},{"id":"BSS004MGYX","indice":"BSS004MGYX","name":"X","designation":"X","commune":"NERSAC","place":"LA SERGENTE","lat":45.626723,"lon":0.0704637,"depth":2.6,"altitude":64.59,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGYX/X\" ;\"BSS004MGYX\")","embedded":true,"imported":true},{"id":"BSS004MGYY","indice":"BSS004MGYY","name":"PZ","designation":"X","commune":"NERSAC","place":"","lat":45.6255112,"lon":0.0706434,"depth":20.05,"altitude":64.59,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGYY/X\" ;\"BSS004MGYY\")","embedded":true,"imported":true},{"id":"BSS004MGZP","indice":"BSS004MGZP","name":"X","designation":"X","commune":"NERSAC","place":"LES GATINELLES","lat":45.6254682,"lon":0.070376,"depth":20.1,"altitude":61.1,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGZP/X\" ;\"BSS004MGZP\")","embedded":true,"imported":true},{"id":"BSS004MGZW","indice":"BSS004MGZW","name":"X","designation":"X","commune":"NERSAC","place":"LES GATINELLES","lat":45.624309,"lon":0.0701548,"depth":20.0,"altitude":63.71,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGZW/X\" ;\"BSS004MGZW\")","embedded":true,"imported":true},{"id":"BSS004MGZX","indice":"BSS004MGZX","name":"X","designation":"X","commune":"NERSAC","place":"LES QUATRE JOURNEAUX","lat":45.6236298,"lon":0.0700238,"depth":3.4,"altitude":62.3,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MGZX/X\" ;\"BSS004MGZX\")","embedded":true,"imported":true},{"id":"BSS004MHAC","indice":"BSS004MHAC","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6235664,"lon":0.0700143,"depth":null,"altitude":62.71,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAC/X\" ;\"BSS004MHAC\")","embedded":true,"imported":true},{"id":"BSS004MHAH","indice":"BSS004MHAH","name":"X","designation":"X","commune":"COURONNE","place":"BOIS DES COURTES","lat":45.6220243,"lon":0.0696207,"depth":3.5,"altitude":60.42,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAH/X\" ;\"BSS004MHAH\")","embedded":true,"imported":true},{"id":"BSS004MHAJ","indice":"BSS004MHAJ","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6217404,"lon":0.0659887,"depth":6.0,"altitude":36.44,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAJ/X\" ;\"BSS004MHAJ\")","embedded":true,"imported":true},{"id":"BSS004MHAM","indice":"BSS004MHAM","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6199083,"lon":0.0693346,"depth":19.8,"altitude":44.63,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAM/X\" ;\"BSS004MHAM\")","embedded":true,"imported":true},{"id":"BSS004MHAQ","indice":"BSS004MHAQ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6199669,"lon":0.0691646,"depth":20.05,"altitude":43.91,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAQ/X\" ;\"BSS004MHAQ\")","embedded":true,"imported":true},{"id":"BSS004MHAR","indice":"BSS004MHAR","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6196606,"lon":0.0691679,"depth":20.05,"altitude":41.39,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAR/X\" ;\"BSS004MHAR\")","embedded":true,"imported":true},{"id":"BSS004MHAS","indice":"BSS004MHAS","name":"X","designation":"X","commune":"COURONNE","place":"BOIS DES COURTES","lat":45.6195693,"lon":0.0691214,"depth":5.0,"altitude":40.41,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAS/X\" ;\"BSS004MHAS\")","embedded":true,"imported":true},{"id":"BSS004MHAV","indice":"BSS004MHAV","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6192797,"lon":0.0690725,"depth":20.1,"altitude":38.87,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHAV/X\" ;\"BSS004MHAV\")","embedded":true,"imported":true},{"id":"BSS004MHBG","indice":"BSS004MHBG","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6188987,"lon":0.0689771,"depth":20.05,"altitude":36.62,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBG/X\" ;\"BSS004MHBG\")","embedded":true,"imported":true},{"id":"BSS004MHBH","indice":"BSS004MHBH","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6186434,"lon":0.0685155,"depth":15.2,"altitude":33.9,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBH/X\" ;\"BSS004MHBH\")","embedded":true,"imported":true},{"id":"BSS004MHBL","indice":"BSS004MHBL","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6185088,"lon":0.0688822,"depth":20.0,"altitude":34.41,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBL/X\" ;\"BSS004MHBL\")","embedded":true,"imported":true},{"id":"BSS004MHBM","indice":"BSS004MHBM","name":"X","designation":"X","commune":"COURONNE","place":"La Négauderie","lat":45.6184731,"lon":0.0685502,"depth":6.61,"altitude":33.79,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBM/X\" ;\"BSS004MHBM\")","embedded":true,"imported":true},{"id":"BSS004MHBN","indice":"BSS004MHBN","name":"X","designation":"X","commune":"COURONNE","place":"La Négauderie","lat":45.6184628,"lon":0.0688461,"depth":7.15,"altitude":34.25,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBN/X\" ;\"BSS004MHBN\")","embedded":true,"imported":true},{"id":"BSS004MHBP","indice":"BSS004MHBP","name":"X","designation":"X","commune":"COURONNE","place":"La Négauderie","lat":45.6184541,"lon":0.0688594,"depth":15.0,"altitude":34.19,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBP/X\" ;\"BSS004MHBP\")","embedded":true,"imported":true},{"id":"BSS004MHBS","indice":"BSS004MHBS","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6184158,"lon":0.0691182,"depth":7.73,"altitude":34.58,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBS/X\" ;\"BSS004MHBS\")","embedded":true,"imported":true},{"id":"BSS004MHBT","indice":"BSS004MHBT","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6181282,"lon":0.0687996,"depth":20.04,"altitude":34.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHBT/X\" ;\"BSS004MHBT\")","embedded":true,"imported":true},{"id":"BSS004MHCA","indice":"BSS004MHCA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6177562,"lon":0.0687037,"depth":20.0,"altitude":33.8,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHCA/X\" ;\"BSS004MHCA\")","embedded":true,"imported":true},{"id":"BSS004MHCK","indice":"BSS004MHCK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6173663,"lon":0.0686088,"depth":20.35,"altitude":34.82,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHCK/X\" ;\"BSS004MHCK\")","embedded":true,"imported":true},{"id":"BSS004MHCL","indice":"BSS004MHCL","name":"X","designation":"X","commune":"COURONNE","place":"LE MARAIS","lat":45.6167597,"lon":0.0681529,"depth":8.14,"altitude":35.65,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHCL/X\" ;\"BSS004MHCL\")","embedded":true,"imported":true},{"id":"BSS004MHCV","indice":"BSS004MHCV","name":"X","designation":"X","commune":"COURONNE","place":"LE MARAIS","lat":45.616722,"lon":0.0684374,"depth":8.31,"altitude":35.71,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHCV/X\" ;\"BSS004MHCV\")","embedded":true,"imported":true},{"id":"BSS004MHCW","indice":"BSS004MHCW","name":"X","designation":"X","commune":"COURONNE","place":"LE MARAIS","lat":45.6166931,"lon":0.0687086,"depth":8.78,"altitude":35.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHCW/X\" ;\"BSS004MHCW\")","embedded":true,"imported":true},{"id":"BSS004MHEB","indice":"BSS004MHEB","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.61672,"lon":0.0683605,"depth":10.0,"altitude":35.7,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHEB/X\" ;\"BSS004MHEB\")","embedded":true,"imported":true},{"id":"BSS004MHEC","indice":"BSS004MHEC","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6165951,"lon":0.0684056,"depth":20.05,"altitude":35.91,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHEC/X\" ;\"BSS004MHEC\")","embedded":true,"imported":true},{"id":"BSS004MHED","indice":"BSS004MHED","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6162784,"lon":0.0683582,"depth":19.6,"altitude":38.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHED/X\" ;\"BSS004MHED\")","embedded":true,"imported":true},{"id":"BSS004MHEG","indice":"BSS004MHEG","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6159095,"lon":0.0683777,"depth":21.5,"altitude":45.8,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHEG/X\" ;\"BSS004MHEG\")","embedded":true,"imported":true},{"id":"BSS004MHEH","indice":"BSS004MHEH","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6158581,"lon":0.0681365,"depth":20.0,"altitude":48.06,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHEH/X\" ;\"BSS004MHEH\")","embedded":true,"imported":true},{"id":"BSS004MHHK","indice":"BSS004MHHK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6155779,"lon":0.0680999,"depth":3.2,"altitude":52.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHHK/X\" ;\"BSS004MHHK\")","embedded":true,"imported":true},{"id":"BSS004MHHY","indice":"BSS004MHHY","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6155249,"lon":0.0681413,"depth":10.0,"altitude":52.17,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHHY/X\" ;\"BSS004MHHY\")","embedded":true,"imported":true},{"id":"BSS004MHJD","indice":"BSS004MHJD","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6150623,"lon":0.0680245,"depth":15.0,"altitude":53.3,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHJD/X\" ;\"BSS004MHJD\")","embedded":true,"imported":true},{"id":"BSS004MHJJ","indice":"BSS004MHJJ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.614163,"lon":0.0677511,"depth":15.0,"altitude":54.28,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHJJ/X\" ;\"BSS004MHJJ\")","embedded":true,"imported":true},{"id":"BSS004MHKM","indice":"BSS004MHKM","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6111455,"lon":0.067102,"depth":4.0,"altitude":56.62,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHKM/X\" ;\"BSS004MHKM\")","embedded":true,"imported":true},{"id":"BSS004MHKN","indice":"BSS004MHKN","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6107758,"lon":0.0670959,"depth":2.7,"altitude":56.93,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHKN/X\" ;\"BSS004MHKN\")","embedded":true,"imported":true},{"id":"BSS004MHKZ","indice":"BSS004MHKZ","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LES CHAGNERACES","lat":45.6095777,"lon":0.0667613,"depth":10.0,"altitude":59.18,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHKZ/X\" ;\"BSS004MHKZ\")","embedded":true,"imported":true},{"id":"BSS004MHLA","indice":"BSS004MHLA","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.6046695,"lon":0.0675603,"depth":0.6,"altitude":62.55,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHLA/X\" ;\"BSS004MHLA\")","embedded":true,"imported":true},{"id":"BSS004MHLB","indice":"BSS004MHLB","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.596179,"lon":0.0660972,"depth":10.11,"altitude":56.41,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHLB/X\" ;\"BSS004MHLB\")","embedded":true,"imported":true},{"id":"BSS004MHLC","indice":"BSS004MHLC","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5959987,"lon":0.0660939,"depth":10.03,"altitude":56.99,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHLC/X\" ;\"BSS004MHLC\")","embedded":true,"imported":true},{"id":"BSS004MHMB","indice":"BSS004MHMB","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5955661,"lon":0.0660911,"depth":10.03,"altitude":58.08,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHMB/X\" ;\"BSS004MHMB\")","embedded":true,"imported":true},{"id":"BSS004MHMC","indice":"BSS004MHMC","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5954675,"lon":0.0661092,"depth":10.06,"altitude":57.48,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHMC/X\" ;\"BSS004MHMC\")","embedded":true,"imported":true},{"id":"BSS004MHMD","indice":"BSS004MHMD","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5950082,"lon":0.0661207,"depth":4.2,"altitude":58.09,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHMD/X\" ;\"BSS004MHMD\")","embedded":true,"imported":true},{"id":"BSS004MHME","indice":"BSS004MHME","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5937191,"lon":0.0660991,"depth":3.5,"altitude":65.41,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHME/X\" ;\"BSS004MHME\")","embedded":true,"imported":true},{"id":"BSS004MHMF","indice":"BSS004MHMF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5921063,"lon":0.06956,"depth":1.5,"altitude":70.43,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHMF/X\" ;\"BSS004MHMF\")","embedded":true,"imported":true},{"id":"BSS004MHNU","indice":"BSS004MHNU","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5735976,"lon":0.066792,"depth":3.1,"altitude":77.01,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHNU/X\" ;\"BSS004MHNU\")","embedded":true,"imported":true},{"id":"BSS004MHPK","indice":"BSS004MHPK","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5887312,"lon":0.065914,"depth":2.9,"altitude":66.55,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHPK/X\" ;\"BSS004MHPK\")","embedded":true,"imported":true},{"id":"BSS004MHPW","indice":"BSS004MHPW","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5866831,"lon":0.0654705,"depth":3.1,"altitude":65.58,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHPW/X\" ;\"BSS004MHPW\")","embedded":true,"imported":true},{"id":"BSS004MHQH","indice":"BSS004MHQH","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5841805,"lon":0.0655646,"depth":2.6,"altitude":66.66,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHQH/X\" ;\"BSS004MHQH\")","embedded":true,"imported":true},{"id":"BSS004MHQJ","indice":"BSS004MHQJ","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5813483,"lon":0.0658043,"depth":3.0,"altitude":64.89,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHQJ/X\" ;\"BSS004MHQJ\")","embedded":true,"imported":true},{"id":"BSS004MHSD","indice":"BSS004MHSD","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5792879,"lon":0.0652333,"depth":2.3,"altitude":68.08,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHSD/X\" ;\"BSS004MHSD\")","embedded":true,"imported":true},{"id":"BSS004MHSE","indice":"BSS004MHSE","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5770389,"lon":0.0650316,"depth":3.0,"altitude":72.55,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHSE/X\" ;\"BSS004MHSE\")","embedded":true,"imported":true},{"id":"BSS004MHSF","indice":"BSS004MHSF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5747506,"lon":0.0647037,"depth":3.3,"altitude":77.23,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHSF/X\" ;\"BSS004MHSF\")","embedded":true,"imported":true},{"id":"BSS004MHSL","indice":"BSS004MHSL","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5713128,"lon":0.0645265,"depth":3.4,"altitude":90.4,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHSL/X\" ;\"BSS004MHSL\")","embedded":true,"imported":true},{"id":"BSS004MHSV","indice":"BSS004MHSV","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"LES VIGNES","lat":45.5708721,"lon":0.0642163,"depth":8.0,"altitude":91.13,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHSV/X\" ;\"BSS004MHSV\")","embedded":true,"imported":true},{"id":"BSS004MHSW","indice":"BSS004MHSW","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5698603,"lon":0.0644623,"depth":15.0,"altitude":96.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHSW/X\" ;\"BSS004MHSW\")","embedded":true,"imported":true},{"id":"BSS004MHTB","indice":"BSS004MHTB","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5650777,"lon":0.0645488,"depth":15.2,"altitude":118.38,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHTB/X\" ;\"BSS004MHTB\")","embedded":true,"imported":true},{"id":"BSS004MHTC","indice":"BSS004MHTC","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Clérignac","lat":45.5650587,"lon":0.0645113,"depth":13.0,"altitude":118.14,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHTC/X\" ;\"BSS004MHTC\")","embedded":true,"imported":true},{"id":"BSS004MHTD","indice":"BSS004MHTD","name":"PZ","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5639199,"lon":0.0640328,"depth":20.1,"altitude":113.04,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHTD/X\" ;\"BSS004MHTD\")","embedded":true,"imported":true},{"id":"BSS004MHTN","indice":"BSS004MHTN","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Clérignac","lat":45.5623184,"lon":0.0637841,"depth":25.25,"altitude":113.99,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHTN/X\" ;\"BSS004MHTN\")","embedded":true,"imported":true},{"id":"BSS004MHTY","indice":"BSS004MHTY","name":"X","designation":"X","commune":"CLAIX","place":"Clérignac","lat":45.5608536,"lon":0.0632459,"depth":30.0,"altitude":115.46,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHTY/X\" ;\"BSS004MHTY\")","embedded":true,"imported":true},{"id":"BSS004MHTZ","indice":"BSS004MHTZ","name":"PZ","designation":"X","commune":"CLAIX","place":"Clérignac","lat":45.5603961,"lon":0.0636678,"depth":35.5,"altitude":117.81,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHTZ/X\" ;\"BSS004MHTZ\")","embedded":true,"imported":true},{"id":"BSS004MHUS","indice":"BSS004MHUS","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.560108,"lon":0.0629904,"depth":24.85,"altitude":126.61,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHUS/X\" ;\"BSS004MHUS\")","embedded":true,"imported":true},{"id":"BSS004MHUT","indice":"BSS004MHUT","name":"PZ","designation":"X","commune":"CLAIX","place":"","lat":45.5601769,"lon":0.062525,"depth":30.0,"altitude":133.83,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHUT/X\" ;\"BSS004MHUT\")","embedded":true,"imported":true},{"id":"BSS004MHUY","indice":"BSS004MHUY","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5593952,"lon":0.0636439,"depth":32.6,"altitude":118.1,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHUY/X\" ;\"BSS004MHUY\")","embedded":true,"imported":true},{"id":"BSS004MHVP","indice":"BSS004MHVP","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5579404,"lon":0.06349,"depth":20.0,"altitude":115.25,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHVP/X\" ;\"BSS004MHVP\")","embedded":true,"imported":true},{"id":"BSS004MHVQ","indice":"BSS004MHVQ","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5568646,"lon":0.0633546,"depth":9.0,"altitude":115.13,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHVQ/X\" ;\"BSS004MHVQ\")","embedded":true,"imported":true},{"id":"BSS004MHVU","indice":"BSS004MHVU","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5568376,"lon":0.063356,"depth":0.7,"altitude":115.13,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHVU/X\" ;\"BSS004MHVU\")","embedded":true,"imported":true},{"id":"BSS004MHVY","indice":"BSS004MHVY","name":"X","designation":"X","commune":"CLAIX","place":"BELLEVUE","lat":45.556539,"lon":0.0633077,"depth":32.8,"altitude":115.15,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHVY/X\" ;\"BSS004MHVY\")","embedded":true,"imported":true},{"id":"BSS004MHWB","indice":"BSS004MHWB","name":"X","designation":"X","commune":"CLAIX","place":"BELLEVUE","lat":45.556485,"lon":0.0633106,"depth":20.5,"altitude":115.02,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHWB/X\" ;\"BSS004MHWB\")","embedded":true,"imported":true},{"id":"BSS004MHXS","indice":"BSS004MHXS","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.555996,"lon":0.0628747,"depth":32.8,"altitude":112.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHXS/X\" ;\"BSS004MHXS\")","embedded":true,"imported":true},{"id":"BSS004MHXT","indice":"BSS004MHXT","name":"X","designation":"X","commune":"CLAIX","place":"BELLEVUE","lat":45.5559431,"lon":0.0636086,"depth":32.8,"altitude":114.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHXT/X\" ;\"BSS004MHXT\")","embedded":true,"imported":true},{"id":"BSS004MHXV","indice":"BSS004MHXV","name":"X","designation":"X","commune":"CLAIX","place":"BELLEVUE","lat":45.5556524,"lon":0.0631751,"depth":10.0,"altitude":114.89,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MHXV/X\" ;\"BSS004MHXV\")","embedded":true,"imported":true},{"id":"BSS004MJAC","indice":"BSS004MJAC","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5552641,"lon":0.0631444,"depth":11.0,"altitude":114.28,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJAC/X\" ;\"BSS004MJAC\")","embedded":true,"imported":true},{"id":"BSS004MJAD","indice":"BSS004MJAD","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5548115,"lon":0.0630657,"depth":15.7,"altitude":105.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJAD/X\" ;\"BSS004MJAD\")","embedded":true,"imported":true},{"id":"BSS004MJAE","indice":"BSS004MJAE","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5548019,"lon":0.0630406,"depth":15.2,"altitude":104.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJAE/X\" ;\"BSS004MJAE\")","embedded":true,"imported":true},{"id":"BSS004MJAV","indice":"BSS004MJAV","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.55418,"lon":0.063035,"depth":11.0,"altitude":95.84,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJAV/X\" ;\"BSS004MJAV\")","embedded":true,"imported":true},{"id":"BSS004MJAW","indice":"BSS004MJAW","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5545397,"lon":0.0643884,"depth":15.12,"altitude":96.22,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJAW/X\" ;\"BSS004MJAW\")","embedded":true,"imported":true},{"id":"BSS004MJAX","indice":"BSS004MJAX","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5544215,"lon":0.0622783,"depth":21.5,"altitude":98.2,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJAX/X\" ;\"BSS004MJAX\")","embedded":true,"imported":true},{"id":"BSS004MJBA","indice":"BSS004MJBA","name":"PZ","designation":"X","commune":"CLAIX","place":"","lat":45.5543233,"lon":0.0630018,"depth":10.0,"altitude":98.21,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJBA/X\" ;\"BSS004MJBA\")","embedded":true,"imported":true},{"id":"BSS004MJBB","indice":"BSS004MJBB","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5543673,"lon":0.062961,"depth":15.0,"altitude":98.7,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJBB/X\" ;\"BSS004MJBB\")","embedded":true,"imported":true},{"id":"BSS004MJBE","indice":"BSS004MJBE","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5543589,"lon":0.0629871,"depth":20.0,"altitude":98.7,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJBE/X\" ;\"BSS004MJBE\")","embedded":true,"imported":true},{"id":"BSS004MJBG","indice":"BSS004MJBG","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5543133,"lon":0.0629638,"depth":11.0,"altitude":98.19,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJBG/X\" ;\"BSS004MJBG\")","embedded":true,"imported":true},{"id":"BSS004MJBH","indice":"BSS004MJBH","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.554088,"lon":0.062963,"depth":20.0,"altitude":93.42,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJBH/X\" ;\"BSS004MJBH\")","embedded":true,"imported":true},{"id":"BSS004MJBJ","indice":"BSS004MJBJ","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.554061,"lon":0.0629644,"depth":14.9,"altitude":92.0,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJBJ/X\" ;\"BSS004MJBJ\")","embedded":true,"imported":true},{"id":"BSS004MJPQ","indice":"BSS004MJPQ","name":"X","designation":"X","commune":"CLAIX","place":"Vallée de Claix","lat":45.5537247,"lon":0.0628539,"depth":10.2,"altitude":85.08,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJPQ/X\" ;\"BSS004MJPQ\")","embedded":true,"imported":true},{"id":"BSS004MJPR","indice":"BSS004MJPR","name":"X","designation":"X","commune":"CLAIX","place":"Vallée du Claix","lat":45.5532558,"lon":0.0631866,"depth":10.5,"altitude":90.73,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004MJPR/X\" ;\"BSS004MJPR\")","embedded":true,"imported":true},{"id":"BSS004NMPJ","indice":"BSS004NMPJ","name":"SONDE TEST","designation":"X","commune":"COURONNE","place":"20,de Quiers","lat":45.60816,"lon":0.0961595,"depth":150.0,"altitude":57.21,"nature":"FORAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NMPJ/X\" ;\"BSS004NMPJ\")","embedded":true,"imported":true},{"id":"BSS004NUYX","indice":"BSS004NUYX","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.637518,"lon":0.0704577,"depth":12.0,"altitude":26.81,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NUYX/X\" ;\"BSS004NUYX\")","embedded":true,"imported":true},{"id":"BSS004NVAU","indice":"BSS004NVAU","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6371764,"lon":0.0704887,"depth":15.48,"altitude":30.034,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NVAU/X\" ;\"BSS004NVAU\")","embedded":true,"imported":true},{"id":"BSS004NVBM","indice":"BSS004NVBM","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5751778,"lon":0.0648479,"depth":15.5,"altitude":74.56,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NVBM/X\" ;\"BSS004NVBM\")","embedded":true,"imported":true},{"id":"BSS004NWAK","indice":"BSS004NWAK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5893877,"lon":0.0876973,"depth":36.0,"altitude":54.39,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWAK/X\" ;\"BSS004NWAK\")","embedded":true,"imported":true},{"id":"BSS004NWCT","indice":"BSS004NWCT","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5896513,"lon":0.0884791,"depth":36.2,"altitude":55.1,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWCT/X\" ;\"BSS004NWCT\")","embedded":true,"imported":true},{"id":"BSS004NWDH","indice":"BSS004NWDH","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5901783,"lon":0.0900429,"depth":36.3,"altitude":55.14,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWDH/X\" ;\"BSS004NWDH\")","embedded":true,"imported":true},{"id":"BSS004NWDV","indice":"BSS004NWDV","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5909073,"lon":0.0920966,"depth":36.0,"altitude":54.06,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWDV/X\" ;\"BSS004NWDV\")","embedded":true,"imported":true},{"id":"BSS004NWFL","indice":"BSS004NWFL","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"chemin, la Cabriotte","lat":45.5789962,"lon":0.06752,"depth":11.0,"altitude":64.85,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWFL/X\" ;\"BSS004NWFL\")","embedded":true,"imported":true},{"id":"BSS004NWFT","indice":"BSS004NWFT","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"chemin lieu dit la Cabriotte","lat":45.5786659,"lon":0.0683331,"depth":11.0,"altitude":63.5,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWFT/X\" ;\"BSS004NWFT\")","embedded":true,"imported":true},{"id":"BSS004NWFY","indice":"BSS004NWFY","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5763884,"lon":0.0656563,"depth":11.0,"altitude":74.4,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWFY/X\" ;\"BSS004NWFY\")","embedded":true,"imported":true},{"id":"BSS004NWGF","indice":"BSS004NWGF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"Cabirotte","lat":45.5760695,"lon":0.0665585,"depth":11.0,"altitude":71.9,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWGF/X\" ;\"BSS004NWGF\")","embedded":true,"imported":true},{"id":"BSS004NWGW","indice":"BSS004NWGW","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5953951,"lon":0.0661002,"depth":13.0,"altitude":57.3,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWGW/X\" ;\"BSS004NWGW\")","embedded":true,"imported":true},{"id":"BSS004NWHJ","indice":"BSS004NWHJ","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5747536,"lon":0.064819,"depth":16.0,"altitude":74.4,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NWHJ/X\" ;\"BSS004NWHJ\")","embedded":true,"imported":true},{"id":"BSS004NXUH","indice":"BSS004NXUH","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.588422,"lon":0.0789568,"depth":36.0,"altitude":56.27,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NXUH/X\" ;\"BSS004NXUH\")","embedded":true,"imported":true},{"id":"BSS004NXUL","indice":"BSS004NXUL","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5888519,"lon":0.0861469,"depth":36.0,"altitude":54.23,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NXUL/X\" ;\"BSS004NXUL\")","embedded":true,"imported":true},{"id":"BSS004NXUR","indice":"BSS004NXUR","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.595926,"lon":0.0660721,"depth":13.0,"altitude":56.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NXUR/X\" ;\"BSS004NXUR\")","embedded":true,"imported":true},{"id":"BSS004NXUU","indice":"BSS004NXUU","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.576631,"lon":0.0649377,"depth":16.0,"altitude":74.41,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NXUU/X\" ;\"BSS004NXUU\")","embedded":true,"imported":true},{"id":"BSS004NYCC","indice":"BSS004NYCC","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5937439,"lon":0.096209,"depth":16.3,"altitude":60.77,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYCC/X\" ;\"BSS004NYCC\")","embedded":true,"imported":true},{"id":"BSS004NYCR","indice":"BSS004NYCR","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5933221,"lon":0.0955765,"depth":16.3,"altitude":60.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYCR/X\" ;\"BSS004NYCR\")","embedded":true,"imported":true},{"id":"BSS004NYCS","indice":"BSS004NYCS","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5930588,"lon":0.0955005,"depth":16.8,"altitude":61.2,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYCS/X\" ;\"BSS004NYCS\")","embedded":true,"imported":true},{"id":"BSS004NYCZ","indice":"BSS004NYCZ","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.639364,"lon":0.0704114,"depth":7.0,"altitude":25.88,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYCZ/X\" ;\"BSS004NYCZ\")","embedded":true,"imported":true},{"id":"BSS004NYDA","indice":"BSS004NYDA","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6376543,"lon":0.0708487,"depth":15.0,"altitude":25.75,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYDA/X\" ;\"BSS004NYDA\")","embedded":true,"imported":true},{"id":"BSS004NYDP","indice":"BSS004NYDP","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5532011,"lon":0.0628175,"depth":40.5,"altitude":91.87,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYDP/X\" ;\"BSS004NYDP\")","embedded":true,"imported":true},{"id":"BSS004NYHF","indice":"BSS004NYHF","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5910892,"lon":0.0925106,"depth":10.0,"altitude":58.76,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYHF/X\" ;\"BSS004NYHF\")","embedded":true,"imported":true},{"id":"BSS004NYJA","indice":"BSS004NYJA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5880522,"lon":0.0838018,"depth":36.0,"altitude":58.63,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYJA/X\" ;\"BSS004NYJA\")","embedded":true,"imported":true},{"id":"BSS004NYJD","indice":"BSS004NYJD","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5883248,"lon":0.0845832,"depth":36.0,"altitude":55.44,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYJD/X\" ;\"BSS004NYJD\")","embedded":true,"imported":true},{"id":"BSS004NYJN","indice":"BSS004NYJN","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5891152,"lon":0.0869159,"depth":35.8,"altitude":54.21,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYJN/X\" ;\"BSS004NYJN\")","embedded":true,"imported":true},{"id":"BSS004NYJZ","indice":"BSS004NYJZ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5899148,"lon":0.089261,"depth":41.7,"altitude":55.37,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYJZ/X\" ;\"BSS004NYJZ\")","embedded":true,"imported":true},{"id":"BSS004NYLA","indice":"BSS004NYLA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5904302,"lon":0.0907227,"depth":36.1,"altitude":56.03,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYLA/X\" ;\"BSS004NYLA\")","embedded":true,"imported":true},{"id":"BSS004NYLM","indice":"BSS004NYLM","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5907141,"lon":0.0915934,"depth":36.5,"altitude":57.58,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYLM/X\" ;\"BSS004NYLM\")","embedded":true,"imported":true},{"id":"BSS004NYMS","indice":"BSS004NYMS","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5871162,"lon":0.0810662,"depth":16.0,"altitude":58.61,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYMS/X\" ;\"BSS004NYMS\")","embedded":true,"imported":true},{"id":"BSS004NYNA","indice":"BSS004NYNA","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5867912,"lon":0.0810448,"depth":16.1,"altitude":58.23,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYNA/X\" ;\"BSS004NYNA\")","embedded":true,"imported":true},{"id":"BSS004NYND","indice":"BSS004NYND","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6321702,"lon":0.0706379,"depth":11.1,"altitude":42.02,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYND/X\" ;\"BSS004NYND\")","embedded":true,"imported":true},{"id":"BSS004NYNE","indice":"BSS004NYNE","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6269526,"lon":0.0706314,"depth":21.0,"altitude":67.86,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYNE/X\" ;\"BSS004NYNE\")","embedded":true,"imported":true},{"id":"BSS004NYPJ","indice":"BSS004NYPJ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6139221,"lon":0.0674942,"depth":21.1,"altitude":63.05,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYPJ/X\" ;\"BSS004NYPJ\")","embedded":true,"imported":true},{"id":"BSS004NYPK","indice":"BSS004NYPK","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6138678,"lon":0.0678309,"depth":21.2,"altitude":62.71,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYPK/X\" ;\"BSS004NYPK\")","embedded":true,"imported":true},{"id":"BSS004NYPL","indice":"BSS004NYPL","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.556671,"lon":0.0635316,"depth":18.1,"altitude":119.34,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYPL/X\" ;\"BSS004NYPL\")","embedded":true,"imported":true},{"id":"BSS004NYPZ","indice":"BSS004NYPZ","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5566893,"lon":0.0631971,"depth":25.3,"altitude":118.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYPZ/X\" ;\"BSS004NYPZ\")","embedded":true,"imported":true},{"id":"BSS004NYRC","indice":"BSS004NYRC","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5547939,"lon":0.0630795,"depth":40.0,"altitude":103.07,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYRC/X\" ;\"BSS004NYRC\")","embedded":true,"imported":true},{"id":"BSS004NYRN","indice":"BSS004NYRN","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5536264,"lon":0.0628848,"depth":40.0,"altitude":82.65,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYRN/X\" ;\"BSS004NYRN\")","embedded":true,"imported":true},{"id":"BSS004NYRW","indice":"BSS004NYRW","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6138828,"lon":0.0677146,"depth":20.0,"altitude":63.03,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYRW/X\" ;\"BSS004NYRW\")","embedded":true,"imported":true},{"id":"BSS004NYTV","indice":"BSS004NYTV","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5922383,"lon":0.0663315,"depth":16.7,"altitude":68.93,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYTV/X\" ;\"BSS004NYTV\")","embedded":true,"imported":true},{"id":"BSS004NYUK","indice":"BSS004NYUK","name":"X","designation":"X","commune":"CLAIX","place":"","lat":45.5544593,"lon":0.0630331,"depth":40.0,"altitude":99.96,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYUK/X\" ;\"BSS004NYUK\")","embedded":true,"imported":true},{"id":"BSS004NYYF","indice":"BSS004NYYF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5879622,"lon":0.0844996,"depth":10.0,"altitude":56.3,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYYF/X\" ;\"BSS004NYYF\")","embedded":true,"imported":true},{"id":"BSS004NYYN","indice":"BSS004NYYN","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5879952,"lon":0.0847289,"depth":14.1,"altitude":57.26,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYYN/X\" ;\"BSS004NYYN\")","embedded":true,"imported":true},{"id":"BSS004NYYR","indice":"BSS004NYYR","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6254135,"lon":0.0706999,"depth":20.0,"altitude":72.76,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYYR/X\" ;\"BSS004NYYR\")","embedded":true,"imported":true},{"id":"BSS004NYYS","indice":"BSS004NYYS","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6254561,"lon":0.0699143,"depth":20.0,"altitude":72.8,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYYS/X\" ;\"BSS004NYYS\")","embedded":true,"imported":true},{"id":"BSS004NYYT","indice":"BSS004NYYT","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6236391,"lon":0.0700361,"depth":20.0,"altitude":68.95,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NYYT/X\" ;\"BSS004NYYT\")","embedded":true,"imported":true},{"id":"BSS004NZAC","indice":"BSS004NZAC","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5981884,"lon":0.0660935,"depth":15.88,"altitude":54.49,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZAC/X\" ;\"BSS004NZAC\")","embedded":true,"imported":true},{"id":"BSS004NZAF","indice":"BSS004NZAF","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5957467,"lon":0.0661072,"depth":6.2,"altitude":58.58,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZAF/X\" ;\"BSS004NZAF\")","embedded":true,"imported":true},{"id":"BSS004NZAL","indice":"BSS004NZAL","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5919587,"lon":0.0659741,"depth":16.0,"altitude":68.48,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZAL/X\" ;\"BSS004NZAL\")","embedded":true,"imported":true},{"id":"BSS004NZAP","indice":"BSS004NZAP","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.574302,"lon":0.0647788,"depth":16.1,"altitude":75.48,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZAP/X\" ;\"BSS004NZAP\")","embedded":true,"imported":true},{"id":"BSS004NZEG","indice":"BSS004NZEG","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5933581,"lon":0.0955747,"depth":15.0,"altitude":60.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZEG/X\" ;\"BSS004NZEG\")","embedded":true,"imported":true},{"id":"BSS004NZEH","indice":"BSS004NZEH","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6390941,"lon":0.0704257,"depth":16.0,"altitude":25.75,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZEH/X\" ;\"BSS004NZEH\")","embedded":true,"imported":true},{"id":"BSS004NZEK","indice":"BSS004NZEK","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6384995,"lon":0.0704315,"depth":15.58,"altitude":25.75,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004NZEK/X\" ;\"BSS004NZEK\")","embedded":true,"imported":true},{"id":"BSS004PAMV","indice":"BSS004PAMV","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6270945,"lon":0.0698533,"depth":30.0,"altitude":66.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PAMV/X\" ;\"BSS004PAMV\")","embedded":true,"imported":true},{"id":"BSS004PANN","indice":"BSS004PANN","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6205405,"lon":0.069391,"depth":20.0,"altitude":49.32,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PANN/X\" ;\"BSS004PANN\")","embedded":true,"imported":true},{"id":"BSS004PASH","indice":"BSS004PASH","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5890858,"lon":0.0868276,"depth":36.0,"altitude":54.25,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PASH/X\" ;\"BSS004PASH\")","embedded":true,"imported":true},{"id":"BSS004PASN","indice":"BSS004PASN","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5899055,"lon":0.0892487,"depth":36.0,"altitude":55.42,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PASN/X\" ;\"BSS004PASN\")","embedded":true,"imported":true},{"id":"BSS004PASR","indice":"BSS004PASR","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5898952,"lon":0.0891979,"depth":35.6,"altitude":55.25,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PASR/X\" ;\"BSS004PASR\")","embedded":true,"imported":true},{"id":"BSS004PATS","indice":"BSS004PATS","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5907051,"lon":0.0915939,"depth":36.0,"altitude":57.95,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PATS/X\" ;\"BSS004PATS\")","embedded":true,"imported":true},{"id":"BSS004PAUB","indice":"BSS004PAUB","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5906854,"lon":0.0915307,"depth":36.0,"altitude":57.52,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PAUB/X\" ;\"BSS004PAUB\")","embedded":true,"imported":true},{"id":"BSS004PAXP","indice":"BSS004PAXP","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5880819,"lon":0.0835564,"depth":36.0,"altitude":58.56,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PAXP/X\" ;\"BSS004PAXP\")","embedded":true,"imported":true},{"id":"BSS004PBBM","indice":"BSS004PBBM","name":"X","designation":"X","commune":"ROULLET SAINT ESTEPHE","place":"","lat":45.5871159,"lon":0.0810534,"depth":16.5,"altitude":58.92,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBBM/X\" ;\"BSS004PBBM\")","embedded":true,"imported":true},{"id":"BSS004PBBN","indice":"BSS004PBBN","name":"X","designation":"X","commune":"NERSAC","place":"","lat":45.6271112,"lon":0.0704945,"depth":25.06,"altitude":66.7,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBBN/X\" ;\"BSS004PBBN\")","embedded":true,"imported":true},{"id":"BSS004PBBX","indice":"BSS004PBBX","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.6138828,"lon":0.0677146,"depth":21.35,"altitude":63.03,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBBX/X\" ;\"BSS004PBBX\")","embedded":true,"imported":true},{"id":"BSS004PBSL","indice":"BSS004PBSL","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5880629,"lon":0.0838654,"depth":36.0,"altitude":58.61,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBSL/X\" ;\"BSS004PBSL\")","embedded":true,"imported":true},{"id":"BSS004PBSN","indice":"BSS004PBSN","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5890878,"lon":0.0869045,"depth":36.0,"altitude":54.24,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBSN/X\" ;\"BSS004PBSN\")","embedded":true,"imported":true},{"id":"BSS004PBUB","indice":"BSS004PBUB","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5874181,"lon":0.0819358,"depth":9.02,"altitude":58.85,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBUB/X\" ;\"BSS004PBUB\")","embedded":true,"imported":true},{"id":"BSS004PBVD","indice":"BSS004PBVD","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5880126,"lon":0.0836627,"depth":9.04,"altitude":58.86,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBVD/X\" ;\"BSS004PBVD\")","embedded":true,"imported":true},{"id":"BSS004PBVE","indice":"BSS004PBVE","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5868239,"lon":0.0802217,"depth":8.01,"altitude":58.98,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBVE/X\" ;\"BSS004PBVE\")","embedded":true,"imported":true},{"id":"BSS004PBWP","indice":"BSS004PBWP","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5865267,"lon":0.0795315,"depth":7.02,"altitude":58.64,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBWP/X\" ;\"BSS004PBWP\")","embedded":true,"imported":true},{"id":"BSS004PBXA","indice":"BSS004PBXA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.586392,"lon":0.0788585,"depth":7.01,"altitude":58.71,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBXA/X\" ;\"BSS004PBXA\")","embedded":true,"imported":true},{"id":"BSS004PBXB","indice":"BSS004PBXB","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5860558,"lon":0.0784014,"depth":6.01,"altitude":58.63,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBXB/X\" ;\"BSS004PBXB\")","embedded":true,"imported":true},{"id":"BSS004PBXG","indice":"BSS004PBXG","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5859658,"lon":0.0777131,"depth":5.04,"altitude":59.11,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBXG/X\" ;\"BSS004PBXG\")","embedded":true,"imported":true},{"id":"BSS004PBYZ","indice":"BSS004PBYZ","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5855502,"lon":0.0773243,"depth":4.05,"altitude":57.44,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBYZ/X\" ;\"BSS004PBYZ\")","embedded":true,"imported":true},{"id":"BSS004PBZA","indice":"BSS004PBZA","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5854672,"lon":0.0765587,"depth":4.02,"altitude":57.14,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBZA/X\" ;\"BSS004PBZA\")","embedded":true,"imported":true},{"id":"BSS004PBZE","indice":"BSS004PBZE","name":"X","designation":"X","commune":"COURONNE","place":"","lat":45.5871358,"lon":0.0811293,"depth":9.6,"altitude":58.6,"nature":"SONDAGE","coordinateSource":"x_ref06 / y_ref06 · Lambert‑93","source":"BRGM · BSS Charente, extrait local embarqué","url":"=LIEN_HYPERTEXTE(\"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS004PBZE/X\" ;\"BSS004PBZE\")","embedded":true,"imported":true}];
const CONFIG = {
  house:{...HOUSE_ESTIMATE},
  dataCenter:{...HOUSE_ESTIMATE},
  communeInsee:16418,
  gridW:120,
  gridH:64,
  dataWidthKm:14,
  dataHeightKm:10,
  zooms:[
    {id:"territory",label:"territoire",short:"12 km",widthKm:12,heightKm:8,contour:10,pan:0.20},
    {id:"commune",label:"commune",short:"6 km",widthKm:6,heightKm:4,contour:5,pan:0.20},
    {id:"sector",label:"secteur",short:"2,7 km",widthKm:2.7,heightKm:1.8,contour:5,pan:0.18},
    {id:"site",label:"site",short:"1,2 km",widthKm:1.2,heightKm:0.8,contour:2,pan:0.16},
    {id:"parcel",label:"parcelle",short:"420 m",widthKm:0.42,heightKm:0.28,contour:1,pan:0.14},
    {id:"detail",label:"détail",short:"160 m",widthKm:0.16,heightKm:0.105,contour:1,pan:0.12}
  ],
  depths:[0,-3,-8,-14,-22,-35],
  cacheHours:168,
};
let HOUSE_WAS_SAVED=false;
try{
  const savedHouse=JSON.parse(localStorage.getItem("atlas-karst-house-v06")||localStorage.getItem("atlas-karst-house-v05")||"null");
  if(savedHouse&&Number.isFinite(savedHouse.lat)&&Number.isFinite(savedHouse.lon)){
    CONFIG.house={lat:savedHouse.lat,lon:savedHouse.lon};HOUSE_WAS_SAVED=true;
    localStorage.setItem("atlas-karst-house-v06",JSON.stringify(CONFIG.house));
    localStorage.removeItem("atlas-karst-house-v05");
  }
}catch{}

const FALLBACK_SURFACE = ["..............~...........~.........................................................................#.................==","..............~...........~..........................................................................=...............===",".............~~...........~..........................................................................=..............====",".............~~...........~..........................................................................==............====.","~~~~~~.......~~...........~...........................................................................=...........====..","...~~~~~~~~~~~~~~~........~.........................................................##.##.............=..........====...","............~~...~~~......~............................................................##..............=........====....",".............~.....~~~....~.......................................................###..................=........===.....","............~~.......~~~~.~.......................................................###....###..###...##.==......====.....","............~~..........~~~...................................................###.......###.#####..##...#......===......","............~.............~~~..................................................###..=..............##...#.....====......","............~...............~~~.................................................#...==....##...==..##....#....===.......","............~.................~~.....................................................==..###...==........#....;;;.......","...........~~.........................................     ##     .................##.==..##....==.......##..===........","...........~~...........................#.                 ##        ..............##..==....##.==.###....#..===........","...........~~..........................#### #       ##               ...................===.##...==.#.....#..===........","...........~........................... @###### #   ####  ## ##      .................##.===....===.###...##====....... ","...........~..........................         ##     #  ###### ##   .................##...======.==###....#===........ ","...........~.......................... ###     ##  ==           ###   .......................===..==.##....====.......  ","~~~~~~.....~.........................   #  =========               ## .....................##.=#...==###...====......   ",".~.~~~~~~~~~.........................   ## =========  ##   #  ==   ###......................##..#=.==.##...===....... # ",".~........~~........................   ### ==    #=== ##  ### ==   ##  ..........................#.==......====.....    ",".~........~~........................ ####  ==    ## ==     ## == ##     .....................###.##==..##.=====....     ","~~........~......................... ####  ==    ##  ========== ###       ...................###..#====##.======...     ","~~........~........................### ##  ==   ###      ==  ==            ..................###..#..==#..======.. ###  ","~........~~........................### ##  =     ##  ###     == ##           ....................#..##....======.   ##  ","~........~~........................##  ##  =  ####   ### ##  == ##            ..................#...##...===..===    #  ","~........~.........................   ##  ==  ###   ##   ### ==                 ..............===.#.#....===..===       ","~........~.........................   ### ==  ##    ##    ### ==                 ............===..##.....===...=#  ##   ","  .......~.........................   ##  ==  ##    ##     ### =   ##              .........===...##....===....=== ##   "," =.......~.........................   ##  =   ###           ## ==  ###              ......===...........===...   #  #  ="," =......~~.........................   ## ==    ##        #     ==  ###               .....==............===...## ==    #"," =......~~.........................##   ==     ###       #     =#                     #..==............===...###  ==   =","=.......~~........................ ##   ==     ###        ###   #    ##              ###.==............===....#    ==  =","........~.........................  ##  ==     ##   ##  ## ##    #= ####              ## ==............===....      == =","........~........................  ###  ==     #### ## ###  ##     # ## ##           ### ==.###.......==#......      = =","........~........................  ###====     ####         ###  ==#    ###          ###  =.##........=#=........    ===","........~.......................   ###  ===    =##             ===  ##    ###        ###  ==..........=#=..........   ==",".......~~.......................   ####   ======###   ==========     =#   ###        ### =====.......====...........   =",".......~~......................          ## ==   ##  ===    =     ##  #   ###         ## =======.....===.............. =",".......~.......................          ###==    #===    ##     ###  #    ##        ### =    #~~~=..=#=...............=",".......~......................            #  ===  ===   # ###    ###  =    ##    ~~~~~~~~~~~~~~~~~======...............=",".......~......................                =====   ####       ###  =              ##  =  #  # #..===................#",".......~.....................                    =    ##         ##   =  #####           = ###  ##..=#=................#","......~~.....................               ##   ==                   =  ######     ###  = ####  ..====...............##","......~~....................                ###  ======         ##    ==#     #     ###  ==      ..=#=................##","......~~....................                 #    ==   ====    ###       ##          ##  ==   ## ..===................=.","......~....................######              ## ==    #  =====##     ##  #        ###   =   ## .====................##","......~....................######              ##  ==  ###     =====   ##   #       ####      ## .====................##",".....~~...................##       ##               =    #         ====##    #        # ##    ###====..................#",".....~~..................##        ### ###          ==   ###            =#==  #         ###  #   =###...#..............#",".....~~..................##  =====     ###          ==   ###               ====#=###   # #   ## .====..................#",".....~....................       ==#    ===         ==                  # ===;;;=======#        ====...................#",".....~.....................    #     #  # =#=========   ##           #####=;;;;;;;;=======     .====...................#",".....~......................  ###              =====    ##          #####==;;;;;;;===   =====  .====...................#",".....~........................  # ##       ##  ==                    ##;==;;;;;;;;==       ========....................=","=...~~.........................   ###      ##  ==     ##             ######=;;  ;==           ===#=.....................","###.~~...........................  #####      ==     ###            ==;;;====;;;;==           .==#=.................   #","###..~............................ #### ##    ==     ##         ;;;;==;;;;;=======    ###     ====..................   =","###..~..............................    ####       ##          ;;###=;;;;;;;;##===    ##      ==#===................ ;;=","###..~................................            ###         ;#####;;;;;;;;;##==      #      ==#=.====.#.####=.....   =","#         =..............................  #### ###          ;;#####;;;;;;;;;;==             ====.....==####=      =   =","#         =................................#### ##           ;;#####;;;;;;;;;;==             ====......   ##       =   =","#         =...................................              ;;####;;  ;;;;;;;==              ==#=......   #        =   ="];
const CAVITY_INVENTORY = [{"id":"POC0002918CS","type":"carrière","name":"LE STERLING"},{"id":"POC0002920CS","type":"carrière","name":"LA GRANDE PERRE BRUNE"},{"id":"POC0002921CS","type":"carrière","name":"CARRIERE DE BARBARY"},{"id":"POC0002923CS","type":"carrière","name":"CARRIERE DU POULET"},{"id":"POC0002924CS","type":"carrière","name":"BOMPART"},{"id":"POCAA0000034","type":"carrière","name":"GIGET SUD"},{"id":"POCAA0000035","type":"carrière","name":"GIGET NORD"},{"id":"POCAW0022034","type":"carrière","name":"Les Buis"},{"id":"POCAW0022036","type":"naturelle","name":"Résurgence de Giget"},{"id":"POCAW0022037","type":"carrière","name":"Carrière Centre"},{"id":"POCAW0022038","type":"naturelle","name":"Grotte des Combes"},{"id":"POCAW0022039","type":"naturelle","name":"Trou du Sterling"},{"id":"POCAW0022040","type":"naturelle","name":"Grotte de la Pierre Dure"},{"id":"POCAW0022041","type":"ouvrage civil","name":"Aqueduc des Prés de la Fontaine"},{"id":"POCAW0022042","type":"naturelle","name":"Trou du Furet"},{"id":"POCAW0022043","type":"naturelle","name":"Trou de la Carrière (Giget 3)"},{"id":"POCAW0022044","type":"naturelle","name":"Rivière de Bompart 1"},{"id":"POCAW0022045","type":"naturelle","name":"Grotte des Petits Champs"},{"id":"POCAW0022046","type":"naturelle","name":"Grotte de Giget 2"},{"id":"POCAW0026576","type":"ouvrage civil","name":"Souterrain de la Source Bompart"}];

const OFFLINE_DEMO_POINTS = [
  {id:"DEMO-RU",glyph:"RU",name:"Balise de démonstration · ruine",kind:"repère synthétique de test",lat:45.59873,lon:0.14642,note:"Balise fictive servant uniquement à tester la découverte progressive."},
  {id:"DEMO-FR",glyph:"FR",name:"Balise de démonstration · friche",kind:"repère synthétique de test",lat:45.59762,lon:0.14848,note:"Aucune friche réelle n’est affirmée à cet endroit."},
  {id:"DEMO-MY",glyph:"MY",name:"Balise de démonstration · anomalie",kind:"repère synthétique de test",lat:45.59918,lon:0.14902,note:"Petit appât à curiosité entièrement artificiel."},
  {id:"DEMO-A",glyph:"A#",name:"Balise de démonstration · carrière",kind:"repère synthétique de test",lat:45.59696,lon:0.14572,note:"Ne correspond pas à une carrière documentée."}
];

const RENDER_MODE_PREF_KEY = "atlas-karst-render-mode-v1";

const state = {
  zoomIndex:1,
  depthIndex:0,
  center:{...CONFIG.house},
  userLocation:null,
  locationLoading:false,
  centerOnLocation:true,
  aroundRadius:500,
  encounterEnabled:true,
  encounterCollection:{},
  encounterSession:null,
  encounterLastId:"",
  activeRelation:null,
  guidedTourId:"",
  guidedTourStep:0,
  guidedTourActive:false,
  scenario:"median",
  renderMode:"symbolic",
  layerSurface:true,
  layerRelief:true,
  layerCadastreBuildings:true,
  layerParcels:false,
  layerBss:true,
  layerObservations:true,
  layerHeritage:true,
  layerLore:true,
  layerCartofriches:true,
  layerCavities:true,
  layerHypothesis:true,
  layerHydrology:true,
  layerLabels:true,
  layerHouse:true,
  ambientMotion:true,
  osm:null,
  osmMeta:null,
  osmBaseCoverage:[],
  osmDetailCoverage:[],
  osmLoading:false,
  osmLastError:"",
  osmParseStats:{droppedPoints:0,droppedGeometries:0},
  osmLegacyChecked:false,
  osmActivityStarted:0,
  osmAttemptLabel:"",
  osmAbortController:null,
  osmAbortRequested:false,
  cavities:[],
  officialCavities:[],
  osmCavities:[],
  localCavities:[],
  observations:[],
  loreItems:[],
  heritageItems:[],
  heritageEnabled:{monument:true,garden:true,house:true,museum:true,wikipedia:true},
  cartofriches:[],
  cartofrichesIncludeReconverted:false,
  cadastreBuildings:[],
  cadastreParcels:[],
  address:null,
  bss:[],
  cavityInventoryOnly:true,
  elevation:null,
  selectedCavity:null,
  selectedCell:null,
  placingHouse:false,
  lastGrid:null,
  selectionSnapNote:"",
  selectionAssistVisible:false,
  allowNetwork:FORCE_ONLINE||!EMBEDDED_SNAPSHOT,
  snapshotSource:EMBEDDED_SNAPSHOT?"embarqué":"session",
  load:{osm:"pending",address:"pending",cadastre:"pending",cavities:"pending",cartofriches:"pending",heritage:"pending",bss:"pending",elevation:"pending"}
};

els = Object.fromEntries([
  "map","mapCanvas","renderFxLayer","zoomTransitionCanvas","canvasHoverMarker","canvasSelectionMarker","canvasPoiMarker","tourMarker","viewport","sidebar","sidebarBackdrop","sidebarToggle","sidebarClose","collapseCards","expandCards","infoToggle","audioToggle","mapDepthUp","mapZoomOut","mapZoomIn","mapHome","mapDepthDown","mainAttribution","readout","readoutBody","readoutSheetHandle","readoutSheetLabel","zoomButtons","depthButtons","zoomOut","zoomIn","depthUp","depthDown",
  "locationBadge","mapTip","offlineNotice","locateMe","clearLocation","centerOnLocation","locationHelp","mapLocate","aroundRadius","refreshAround","aroundSummary","aroundList","encounterEnabled","observeSurroundings","testEncounter","openCodex","encounterStatus","encounterProgressBar","encounterOverlay","encounterWindow","encounterDialogTitle","encounterClose","encounterBody","guidedTourSelect","guidedTourStart","guidedTourIntro","guidedTourPanel","guidedTourProgressText","guidedTourDistance","guidedTourProgressBar","guidedTourStep","guidedTourPrev","guidedTourRecenter","guidedTourNext","guidedTourStop",
  "zoomLabel","depthLabel","cellSizeLabel","centerLabel","truthBadge","zoomHelp","homeBtn","recenterSelected","exportBtn",
  "selectionAssist","selectionAssistClose","selectionLoupe","selectionUp","selectionLeft","selectionCenter","selectionRight","selectionDown","selectionAssistText","depthTransition","poiSelectionFx","worldBoundaryFrame","relationOverlay","relationLine","relationStart","relationEnd","relationLabel",
  "snapshotStatus","snapshotHelp","exportSnapshotJson","importSnapshotJson","snapshotFile","exportStandaloneHtml","clearSavedSnapshot",
  "placeHouse","resetHouse","houseHelp","houseLat","houseLon","applyHouseCoords","geocodeHouse","snapHouseBuilding","openHistory","hoverTip","hoverCellIndicator",
  "cavitySelect","cavityHelp","syncOsm","testOsm","openOsmQuery","importOsmJson","osmFile","osmHelp","cartofrichesCount","cartofrichesSummary","syncCartofriches","downloadCartofriches","importCartofriches","clearCartofriches","cartofrichesFile","cartofrichesReconverted","cartofrichesHelp","heritageCount","heritageSummary","heritageMonuments","heritageGardens","heritageHomes","heritageMuseums","heritageWikipedia","syncCultureHeritage","syncWikipediaHeritage","clearHeritage","heritageHelp","bssCount","bssSummary","syncPiezo","openBssDownload","importBss","clearBss","bssFile","bssHelp","observationMode","observationConfidence","observationRadius","observationSeason","localType","localName","addLocalMarker","removeLocalMarker","localHelp","loreCategory","lorePeriod","loreName","loreSource","loreNote","addLoreItem","removeLoreItem","loreHelp","retryData","osmStatus","addressStatus","cadastreStatus","cavityStatus","cartofrichesStatus","heritageStatus","bssStatus","elevationStatus","loadProgress","sourceNote",
  "scenario","renderModeSymbolic","renderModeAscii","renderModeHelp","layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion",
  "debugPanel","debugToggle","debugRenderTime","debugRenderAverage","debugGrid","debugPoiCount","debugStorage","debugPointer","debugErrors","debugChecks","runSelfCheck","exportDebugReport"
].map(id=>[id,document.getElementById(id)]));

function activeMapSurface(){return CANVAS_RENDERER?els.mapCanvas:els.map}
const canvasRuntime={metrics:null,layoutSignature:"",styleCache:new Map(),probe:null,lastGrid:null,dpr:1,ctx:null,measureCanvas:null,measureCtx:null,signalCanvas:null,signalCtx:null};
const renderPipelineRuntime={
  frame:0,dataRevision:0,osmRevision:0,fxRevision:0,lastFxOsmRevision:-1,
  lastMode:"",lastReason:"",lastStages:[],lastFinalizedFrame:0,lastFinalizedAt:0
};
function markMapDataRevision(source="data"){
  renderPipelineRuntime.dataRevision++;
  if(source==="osm")renderPipelineRuntime.osmRevision++;
}
function beginCanvasPipeline(mode,reason="direct"){
  renderPipelineRuntime.frame++;renderPipelineRuntime.lastMode=mode;renderPipelineRuntime.lastReason=reason;
  renderPipelineRuntime.lastStages=["canvas-size","map-data"];
  return renderPipelineRuntime.frame;
}
function recordCanvasStage(stage){renderPipelineRuntime.lastStages.push(stage)}

function cssNumber(name,fallback){
  const main=document.querySelector("main");
  const value=parseFloat(getComputedStyle(main).getPropertyValue(name));
  return Number.isFinite(value)?value:fallback;
}
function canvasFontFamily(){return 'ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace'}
function canvasMeasureContext(){
  if(canvasRuntime.measureCtx)return canvasRuntime.measureCtx;
  canvasRuntime.measureCanvas=document.createElement("canvas");
  canvasRuntime.measureCtx=canvasRuntime.measureCanvas.getContext("2d");
  return canvasRuntime.measureCtx;
}
function canvasContext(){
  if(canvasRuntime.ctx)return canvasRuntime.ctx;
  // Un Canvas opaque évite le blanchiment de la couche lors des transforms GPU,
  // particulièrement visible dans Firefox pendant un glisser-déposer.
  canvasRuntime.ctx=els.mapCanvas.getContext("2d",{alpha:false});
  return canvasRuntime.ctx;
}
function measureCanvasLayout(fontSize=cssNumber("--map-font-size",12),padding=cssNumber("--map-padding",17)){
  const ctx=canvasMeasureContext();
  ctx.font=`${fontSize}px ${canvasFontFamily()}`;
  const cellW=Math.max(3,ctx.measureText("M").width);
  const cellH=Math.max(4,fontSize*1.04);
  return {fontSize,padding,cellW,cellH,width:padding*2+CONFIG.gridW*cellW,height:padding*2+CONFIG.gridH*cellH};
}

function desiredCanvasDisplayScale(){
  // V0.16q : la grille responsive est l'unique autorité de dimensionnement.
  // Le bitmap n'est plus agrandi une seconde fois après son calcul.
  return 1;
}

function syncCanvasSize(){
  if(!CANVAS_RENDERER||!els.mapCanvas)return null;
  const m=measureCanvasLayout();
  const compact=matchMedia("(max-width:700px)").matches;
  const dpr=adaptiveCanvasDpr(m.width,m.height,compact);
  const displayScale=1,displayWidth=Math.round(m.width),displayHeight=Math.round(m.height);
  const pixelW=Math.max(1,Math.round(m.width*dpr)),pixelH=Math.max(1,Math.round(m.height*dpr));
  performanceRuntime.canvasPixels=pixelW*pixelH;
  const bitmapChanged=els.mapCanvas.width!==pixelW||els.mapCanvas.height!==pixelH;
  const cssChanged=els.mapCanvas.style.width!==`${displayWidth}px`||els.mapCanvas.style.height!==`${displayHeight}px`;
  if(els.mapCanvas.width!==pixelW)els.mapCanvas.width=pixelW;
  if(els.mapCanvas.height!==pixelH)els.mapCanvas.height=pixelH;
  els.mapCanvas.style.width=`${displayWidth}px`;els.mapCanvas.style.height=`${displayHeight}px`;
  const layoutSignature=[m.fontSize,m.padding,CONFIG.gridW,CONFIG.gridH,dpr,displayWidth,displayHeight].join("|");
  canvasRuntime.metrics={...m,dpr,displayScale,displayWidth,displayHeight,bitmapChanged,cssChanged,layoutSignature};
  canvasRuntime.layoutSignature=layoutSignature;canvasRuntime.dpr=dpr;
  return canvasRuntime.metrics;
}

function canvasStyleProbe(){
  if(canvasRuntime.probe?.isConnected)return canvasRuntime.probe;
  const probe=document.createElement("span");probe.className="cell canvas-style-probe";probe.textContent="M";document.body.appendChild(probe);canvasRuntime.probe=probe;return probe;
}
function transparentColor(value){return !value||value==="transparent"||/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(value)}
function canvasVisualFor(classes){
  const band=document.body.dataset.depthBand||"surface",key=`${band}|${classes}`;
  const cached=canvasRuntime.styleCache.get(key);if(cached)return cached;
  const probe=canvasStyleProbe();probe.className=`cell canvas-style-probe ${classes}`;
  const cs=getComputedStyle(probe);
  const visual={color:cs.color||"#dce9e1",background:cs.backgroundColor||"transparent",fontWeight:cs.fontWeight||"400",opacity:Number.parseFloat(cs.opacity)||1};
  canvasRuntime.styleCache.set(key,visual);return visual;
}
function globalSignalSurface(){
  if(!canvasRuntime.signalCanvas){
    canvasRuntime.signalCanvas=document.createElement("canvas");
    canvasRuntime.signalCtx=canvasRuntime.signalCanvas.getContext("2d",{alpha:true});
  }
  const c=canvasRuntime.signalCanvas;
  if(c.width!==els.mapCanvas.width)c.width=els.mapCanvas.width;
  if(c.height!==els.mapCanvas.height)c.height=els.mapCanvas.height;
  return {canvas:c,ctx:canvasRuntime.signalCtx};
}
function drawGlobalSignalPass(ctx,m,mode){
  if(!els.mapCanvas||!m)return;
  const compact=matchMedia("(max-width:700px)").matches;
  const moving=!!els.viewport?.classList.contains("panning")||!!activeMapSurface()?.classList.contains("pinching");
  const {canvas:scratch,ctx:sctx}=globalSignalSurface();
  if(!sctx)return;
  const symbolic=mode==="symbolic";

  // Extraction emissive globale : les tons sombres restent presque noirs, tandis
  // que routes, eau, bâtiments, glyphes et contours nourrissent réellement le halo.
  sctx.save();
  sctx.setTransform(1,0,0,1,0,0);
  sctx.globalCompositeOperation="copy";
  sctx.globalAlpha=1;
  sctx.filter=symbolic?"brightness(1.56) contrast(1.72) saturate(1.42)":"brightness(1.78) contrast(1.95) saturate(1.28)";
  sctx.drawImage(els.mapCanvas,0,0);
  sctx.restore();

  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation="screen";
  if(symbolic){
    ctx.globalAlpha=compact?.18:.31;
    ctx.filter=(!compact&&!moving)?"blur(2.6px)":"none";
    ctx.drawImage(scratch,0,0);
    ctx.filter="none";
    ctx.globalAlpha=compact?.11:.18;
    ctx.drawImage(scratch,-1,0);ctx.drawImage(scratch,1,0);
  }else{
    // ASCII : pas de blur coûteux. Trois copies très légèrement décalées donnent
    // une persistance cathodique sur toute la carte, sans travail par glyphe.
    ctx.filter="none";
    ctx.globalAlpha=compact?.10:.16;ctx.drawImage(scratch,-1,0);
    ctx.globalAlpha=compact?.10:.16;ctx.drawImage(scratch,1,0);
    ctx.globalAlpha=compact?.12:.21;ctx.drawImage(scratch,0,1);
  }
  ctx.restore();

  ctx.save();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalCompositeOperation="screen";
  const wash=ctx.createLinearGradient(0,0,m.width,m.height);
  if(symbolic){
    wash.addColorStop(0,"rgba(83,255,178,.145)");
    wash.addColorStop(.48,"rgba(188,255,222,.055)");
    wash.addColorStop(1,"rgba(72,216,255,.12)");
  }else{
    wash.addColorStop(0,"rgba(80,255,132,.085)");
    wash.addColorStop(.5,"rgba(188,255,204,.042)");
    wash.addColorStop(1,"rgba(66,213,118,.073)");
  }
  ctx.fillStyle=wash;ctx.fillRect(0,0,m.width,m.height);ctx.restore();
}
function drawCanvasModeFinish(ctx,m,mode){
  // Post-traitement statique réellement inclus dans le bitmap final.
  // Il est recalculé après chaque redraw, y compris après fusion de données OSM.
  const symbolic=mode==="symbolic";
  ctx.save();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalCompositeOperation="screen";
  if(symbolic){
    ctx.globalAlpha=.075;ctx.strokeStyle="#8fffd0";ctx.lineWidth=.5;ctx.beginPath();
    const stepX=Math.max(24,Math.round(m.cellW*12)),stepY=Math.max(22,Math.round(m.cellH*8));
    for(let x=m.padding;x<m.width-m.padding;x+=stepX){ctx.moveTo(x,m.padding);ctx.lineTo(x,m.height-m.padding)}
    for(let y=m.padding;y<m.height-m.padding;y+=stepY){ctx.moveTo(m.padding,y);ctx.lineTo(m.width-m.padding,y)}
    ctx.stroke();
  }else{
    ctx.globalAlpha=.065;ctx.fillStyle="#caffd7";
    for(let y=1;y<m.height;y+=3)ctx.fillRect(0,y,m.width,.55);
    ctx.globalAlpha=.025;ctx.fillStyle="#5dff9b";
    for(let x=2;x<m.width;x+=6)ctx.fillRect(x,0,.45,m.height);
  }
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
  const vignette=ctx.createRadialGradient(m.width*.5,m.height*.47,Math.min(m.width,m.height)*.18,m.width*.5,m.height*.5,Math.max(m.width,m.height)*.72);
  vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.72,"rgba(0,0,0,.025)");vignette.addColorStop(1,symbolic?"rgba(0,8,5,.24)":"rgba(0,5,2,.30)");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,m.width,m.height);ctx.restore();
}
function syncRenderFxGeometry(m=canvasRuntime.metrics){
  const fx=els.renderFxLayer,canvas=els.mapCanvas;if(!fx||!canvas||!m)return;
  // offsetLeft/Top suivent le contenu scrollable : les FX restent collés au
  // bitmap pendant le pan, au lieu de flotter sur tout le viewport.
  fx.style.left=`${canvas.offsetLeft}px`;fx.style.top=`${canvas.offsetTop}px`;
  fx.style.width=`${canvas.offsetWidth||m.displayWidth}px`;fx.style.height=`${canvas.offsetHeight||m.displayHeight}px`;
}
function restartRenderFxAnimations(){
  const fx=els.renderFxLayer;if(!fx)return;
  fx.classList.add("fx-restart");void fx.offsetWidth;fx.classList.remove("fx-restart");
}
function finalizeCanvasFrame(ctx,m,mode,reason="direct",frame=renderPipelineRuntime.frame){
  recordCanvasStage("signal-pass");drawGlobalSignalPass(ctx,m,mode);
  recordCanvasStage("mode-finish");drawCanvasModeFinish(ctx,m,mode);
  recordCanvasStage("fx-final");
  renderPipelineRuntime.fxRevision++;renderPipelineRuntime.lastFinalizedFrame=frame;renderPipelineRuntime.lastFinalizedAt=performance.now();
  syncRenderFxGeometry(m);
  const fxNeedsRestart=renderPipelineRuntime.lastFxOsmRevision!==renderPipelineRuntime.osmRevision||
    els.renderFxLayer?.dataset.mode!==mode||reason==="render-mode";
  if(els.renderFxLayer){
    els.renderFxLayer.dataset.mode=mode;els.renderFxLayer.dataset.canvasFrame=String(frame);
    els.renderFxLayer.dataset.osmRevision=String(renderPipelineRuntime.osmRevision);
  }
  if(fxNeedsRestart){restartRenderFxAnimations();renderPipelineRuntime.lastFxOsmRevision=renderPipelineRuntime.osmRevision}
  pulseRenderFxActivity(reason==="boot"?1200:900,reason);
}

function drawAsciiCanvasMap(grid=state.lastGrid,reason="direct"){
  if(!CANVAS_RENDERER||!grid||!els.mapCanvas)return 0;
  const m=syncCanvasSize();if(!m)return 0;
  const frame=beginCanvasPipeline("ascii",reason);canvasRuntime.lastGrid=grid;
  const ctx=canvasContext();
  ctx.setTransform(m.dpr,0,0,m.dpr,0,0);
  // Le bitmap est explicitement opaque. Les fonds semi-transparents des cellules
  // sont ainsi composités ici, et non par le navigateur au moment du drag.
  const mapCore=getComputedStyle(document.body).getPropertyValue("--map-core").trim()||"#06110c";
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle=mapCore;ctx.fillRect(0,0,m.width,m.height);
  ctx.textBaseline="top";ctx.textAlign="left";ctx.fontKerning="none";
  let visiblePoiCount=0;
  // Fonds de relief, groupés horizontalement pour limiter les appels de dessin.
  for(let y=0;y<CONFIG.gridH;y++){
    let runStart=0,runBg=null;
    const flushBg=x=>{if(runBg&&!transparentColor(runBg))ctx.fillRect(m.padding+runStart*m.cellW,m.padding+y*m.cellH,(x-runStart)*m.cellW,m.cellH)};
    for(let x=0;x<=CONFIG.gridW;x++){
      const c=x<CONFIG.gridW?grid.grid[y][x]:null;
      const shade=c&&state.layerRelief&&Number.isFinite(c.elev)?` shade${c.shade||0}`:"";
      const visual=c?canvasVisualFor(`${c.cls||""}${shade}`):null;
      const bg=visual?.background||null;
      if(x===0){runBg=bg;runStart=0}else if(bg!==runBg){flushBg(x);runStart=x;runBg=bg}
    }
  }
  // Glyphes, groupés par style. Les POI sont dessinés seuls avec un léger halo statique.
  for(let y=0;y<CONFIG.gridH;y++){
    let text="",startX=0,lastKey="",lastVisual=null;
    const flush=()=>{if(!text||!lastVisual)return;ctx.globalAlpha=lastVisual.opacity;ctx.fillStyle=lastVisual.color;ctx.shadowBlur=0;ctx.font=`${lastVisual.fontWeight} ${m.fontSize}px ${canvasFontFamily()}`;ctx.fillText(text,m.padding+startX*m.cellW,m.padding+y*m.cellH);text=""};
    for(let x=0;x<CONFIG.gridW;x++){
      const c=grid.grid[y][x],shade=state.layerRelief&&Number.isFinite(c.elev)?` shade${c.shade||0}`:"";
      const visual=canvasVisualFor(`${c.cls||""}${shade}`),key=`${visual.color}|${visual.fontWeight}|${visual.opacity}`;
      const poi=poiEffectKind(c);
      if(poi){
        flush();visiblePoiCount++;ctx.globalAlpha=visual.opacity;ctx.fillStyle=visual.color;ctx.font=`${visual.fontWeight} ${m.fontSize}px ${canvasFontFamily()}`;ctx.shadowColor=visual.color;ctx.shadowBlur=Math.max(2,m.fontSize*.34);ctx.fillText(c.ch,m.padding+x*m.cellW,m.padding+y*m.cellH);ctx.shadowBlur=0;lastKey="";lastVisual=null;startX=x+1;continue;
      }
      if(!text){text=c.ch;startX=x;lastKey=key;lastVisual=visual}
      else if(key===lastKey){text+=c.ch}
      else{flush();text=c.ch;startX=x;lastKey=key;lastVisual=visual}
    }
    flush();
  }
  finalizeCanvasFrame(ctx,m,"ascii",reason,frame);
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  return visiblePoiCount;
}
function effectiveRenderMode(){
  return state.renderMode==="symbolic"?"symbolic":"ascii";
}
function symbolicTerrainStyle(cell){
  const cls=String(cell?.cls||"");
  if(cls.includes("c-water"))return {fill:"#0f414b",kind:"water"};
  if(cls.includes("c-forest"))return {fill:"#16472a",kind:"forest"};
  if(cls.includes("c-meadow"))return {fill:"#295538",kind:"meadow"};
  if(cls.includes("c-field"))return {fill:"#4b4324",kind:"field"};
  if(cls.includes("c-scrub"))return {fill:"#2b4931",kind:"scrub"};
  if(cls.includes("c-quarry"))return {fill:"#5b4932",kind:"quarry"};
  if(cls.includes("c-residential")||cls.includes("c-clearing"))return {fill:"#253b35",kind:"settled"};
  if(cls.includes("c-rock"))return {fill:"#354741",kind:"rock"};
  if(cls.includes("c-soil"))return {fill:"#4a3325",kind:"soil"};
  return {fill:"#0d2418",kind:"plain"};
}
function symbolicOsmLandStyle(tags={}){
  const lu=tags.landuse,n=tags.natural;
  if(lu==="forest"||n==="wood")return {fill:"#174b2c",stroke:"#3d8b58",kind:"forest"};
  if(lu==="meadow"||lu==="grass")return {fill:"#2b5837",stroke:"#62a56e",kind:"meadow"};
  if(["farmland","orchard","vineyard"].includes(lu))return {fill:"#504725",stroke:"#a08b43",kind:"field"};
  if(lu==="quarry")return {fill:"#604d35",stroke:"#c08f5d",kind:"quarry"};
  if(lu==="residential"||lu==="industrial")return {fill:"#293f38",stroke:"#66877a",kind:"settled"};
  if(n==="scrub")return {fill:"#315036",stroke:"#6b9b68",kind:"scrub"};
  if(n==="water")return {fill:"#105361",stroke:"#62dff2",kind:"water"};
  if(lu==="cemetery")return {fill:"#314238",stroke:"#78967f",kind:"settled"};
  return null;
}
function symbolicProject(lon,lat,extent,m){
  return {
    x:m.padding+((lon-extent.west)/(extent.east-extent.west))*Math.max(1,CONFIG.gridW-1)*m.cellW+m.cellW/2,
    y:m.padding+((extent.north-lat)/(extent.north-extent.south))*Math.max(1,CONFIG.gridH-1)*m.cellH+m.cellH/2
  };
}
function symbolicTraceCoords(ctx,coords,extent,m,close=false){
  if(!coords?.length)return false;
  ctx.beginPath();let started=false;
  for(const pair of coords){
    const lon=+pair[0],lat=+pair[1];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    const p=symbolicProject(lon,lat,extent,m);
    if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y);
  }
  if(close&&started)ctx.closePath();
  return started;
}
function symbolicDrawPatterns(ctx,grid,m){
  const close=state.zoomIndex>=3;
  ctx.lineWidth=Math.max(.55,m.fontSize*.045);ctx.lineCap="round";
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const c=grid.grid[y][x],s=symbolicTerrainStyle(c),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH;
    const seed=(x*17+y*29)%11;
    if(s.kind==="forest"&&seed<3){
      ctx.fillStyle="rgba(112,220,139,.43)";ctx.beginPath();ctx.moveTo(cx,cy-m.cellH*.28);ctx.lineTo(cx-m.cellW*.25,cy+m.cellH*.22);ctx.lineTo(cx+m.cellW*.25,cy+m.cellH*.22);ctx.closePath();ctx.fill();
    }else if(s.kind==="field"&&(seed<4||close)){
      ctx.strokeStyle="rgba(236,210,112,.31)";ctx.beginPath();ctx.moveTo(cx-m.cellW*.42,cy+m.cellH*.24);ctx.lineTo(cx+m.cellW*.42,cy-m.cellH*.24);ctx.stroke();
    }else if(s.kind==="meadow"&&seed<2){
      ctx.fillStyle="rgba(179,235,164,.38)";ctx.beginPath();ctx.arc(cx,cy,Math.max(.55,m.fontSize*.045),0,Math.PI*2);ctx.fill();
    }else if(s.kind==="scrub"&&seed<2){
      ctx.strokeStyle="rgba(157,221,153,.33)";ctx.beginPath();ctx.moveTo(cx-2,cy-2);ctx.lineTo(cx+2,cy+2);ctx.moveTo(cx+2,cy-2);ctx.lineTo(cx-2,cy+2);ctx.stroke();
    }else if(s.kind==="quarry"&&seed<4){
      ctx.strokeStyle="rgba(245,201,133,.36)";ctx.beginPath();ctx.moveTo(cx-m.cellW*.35,cy+m.cellH*.18);ctx.lineTo(cx,cy-m.cellH*.18);ctx.lineTo(cx+m.cellW*.35,cy+m.cellH*.08);ctx.stroke();
    }
  }
}
function symbolicDrawOsmPolygons(ctx,grid,m){
  if(!state.osm)return;
  const features=queryOsmFeatures(grid.extent);
  for(const f of features){
    const t=f.tags||{};if(!f.closed||t.building)continue;
    const style=symbolicOsmLandStyle(t);if(!style)continue;
    if(!symbolicTraceCoords(ctx,f.coords,grid.extent,m,true))continue;
    ctx.save();
    // Remplissage un peu plus translucide : le fond phosphore reste perceptible.
    ctx.globalAlpha=.73;ctx.fillStyle=style.fill;ctx.fill();
    // Aura de contour peu coûteuse, sans shadowBlur.
    ctx.globalAlpha=.18;ctx.strokeStyle=style.stroke;ctx.lineWidth=Math.max(2.2,m.fontSize*.19);ctx.stroke();
    ctx.globalAlpha=.98;ctx.strokeStyle=style.stroke;ctx.lineWidth=Math.max(.75,m.fontSize*.068);ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
/* V0.16b — réseaux vectoriels stables.
   Les routes et cours d'eau ne sont plus reconstruits à partir du voisinage
   des cellules. Cette ancienne méthode créait des diagonales opportunistes,
   des triangles et des motifs différents après chaque déplacement. On dessine
   maintenant directement les géométries OSM complètes, simplifiées de façon
   déterministe par niveau de zoom. */
function symbolicNetworkKind(tags={}){
  const waterway=String(tags.waterway||"").toLowerCase();
  if(waterway){
    if(waterway==="river"||waterway==="canal")return "water-major";
    if(waterway==="stream")return "water";
    if(waterway==="ditch"||waterway==="drain")return "water-minor";
    return "water";
  }
  const highway=String(tags.highway||"").toLowerCase();
  if(!highway)return "";
  if(["motorway","trunk","primary","secondary"].includes(highway))return "road-major";
  if(["tertiary","unclassified","residential"].includes(highway))return "road";
  if(["service","living_street"].includes(highway))return "road-minor";
  if(["track","path","footway","cycleway","bridleway","steps"].includes(highway))return "path";
  return "road-minor";
}
function symbolicNetworkToleranceMeters(kind){
  const road=[95,58,30,14,6,2.5],water=[72,42,22,10,4.5,2],minor=[120,78,42,20,9,4];
  const table=kind==="water-major"||kind==="water"?water:kind==="water-minor"||kind==="path"||kind==="road-minor"?minor:road;
  return table[clamp(state.zoomIndex,0,table.length-1)];
}
function symbolicPointDistanceSq(a,b){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function symbolicPointSegmentDistanceSq(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  if(dx===0&&dy===0)return symbolicPointDistanceSq(p,a);
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);
  const q={x:a.x+t*dx,y:a.y+t*dy};return symbolicPointDistanceSq(p,q);
}
function symbolicSimplifyProjected(points,tolerance){
  if(points.length<=2)return points.slice();
  const tol2=tolerance*tolerance,keep=new Uint8Array(points.length);keep[0]=1;keep[points.length-1]=1;
  const stack=[[0,points.length-1]];
  while(stack.length){
    const [first,last]=stack.pop();let index=-1,max=tol2;
    for(let i=first+1;i<last;i++){
      const d=symbolicPointSegmentDistanceSq(points[i],points[first],points[last]);
      if(d>max){index=i;max=d}
    }
    if(index>0){keep[index]=1;stack.push([first,index],[index,last])}
  }
  return points.filter((_,i)=>keep[i]);
}
function symbolicFeatureMeters(coords,lat0){
  const kx=kmPerLon(lat0)*1000,ky=111320;
  const out=[];let previous=null;
  for(const pair of coords||[]){
    const lon=+pair[0],lat=+pair[1];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    const p={x:lon*kx,y:lat*ky,lon,lat};
    if(previous&&symbolicPointDistanceSq(p,previous)<.04)continue;
    out.push(p);previous=p;
  }
  return out;
}
function symbolicNetworkStyleLabDraft(kind,m){
  const fs=m.fontSize;
  if(kind==="water-major")return {color:"#63ddff",outer:"rgba(4,18,27,.94)",width:Math.max(2.9,fs*.285),casing:Math.max(1.95,fs*.19),dash:[],glow:"rgba(100,225,255,.18)",glowBlur:10};
  if(kind==="water")return {color:"#58d1f2",outer:"rgba(3,18,24,.88)",width:Math.max(2.0,fs*.205),casing:Math.max(1.25,fs*.135),dash:[],glow:"rgba(83,214,244,.12)",glowBlur:7};
  if(kind==="water-minor")return {color:"rgba(108,211,232,.9)",outer:null,width:Math.max(1.05,fs*.105),casing:0,dash:[5,3],glow:null,glowBlur:0};
  if(kind==="road-major")return {color:"#e7d192",outer:"rgba(27,20,8,.94)",width:Math.max(2.45,fs*.24),casing:Math.max(1.8,fs*.17),dash:[],glow:"rgba(245,222,148,.10)",glowBlur:8};
  if(kind==="road")return {color:"#ccb87f",outer:"rgba(24,19,10,.86)",width:Math.max(1.62,fs*.155),casing:Math.max(1.15,fs*.105),dash:[],glow:"rgba(218,197,132,.07)",glowBlur:5};
  if(kind==="road-minor")return {color:"rgba(197,180,127,.9)",outer:"rgba(20,17,10,.68)",width:Math.max(1.08,fs*.102),casing:Math.max(.72,fs*.058),dash:[],glow:null,glowBlur:0};
  return {color:"rgba(185,166,118,.82)",outer:null,width:Math.max(.9,fs*.078),casing:0,dash:[4,4],glow:null,glowBlur:0};
}
function symbolicCornerRadius(kind,m){
  const fs=m.fontSize;
  if(kind==="water-major")return Math.max(4,fs*.72);
  if(kind==="water")return Math.max(3,fs*.55);
  if(kind==="road-major")return Math.max(3.4,fs*.60);
  if(kind==="road")return Math.max(2.5,fs*.42);
  if(kind==="road-minor")return Math.max(1.8,fs*.30);
  return Math.max(1.4,fs*.22);
}
function symbolicTraceNetworkPath(ctx,coords,extent,m,kind="road"){
  if(!coords?.length)return false;
  const pts=[];
  for(const [lon,lat] of coords){
    const p=symbolicProject(lon,lat,extent,m);
    if(!pts.length||Math.hypot(p.x-pts[pts.length-1].x,p.y-pts[pts.length-1].y)>.35)pts.push(p);
  }
  if(pts.length<2)return false;
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pts[0].y);
  // Précision d'abord : on suit la polyline simplifiée exacte, sans arrondir les
  // sommets. Le côté "écran vectoriel" provient du casing et du glow, pas d'une
  // interpolation qui réinterprète la topologie des carrefours.
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
  return true;
}
function symbolicDrawOsmNetworksLabDraft(ctx,grid,m){
  if(!state.osm)return 0;
  const groups=new Map();let count=0;
  for(const feature of queryOsmFeatures(grid.extent)){
    const kind=symbolicNetworkKind(feature.tags||{});if(!kind||!symbolicNetworkVisible(kind))continue;
    const coords=symbolicSimplifiedCoords(feature,kind);if(coords.length<2)continue;
    if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(coords);count++;
  }
  const order=["water-minor","water","water-major","path","road-minor","road","road-major"];
  for(const kind of order){
    const paths=groups.get(kind);if(!paths?.length)continue;
    const style=symbolicNetworkStyleLabDraft(kind,m);ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    if(style.glow&&style.glowBlur>0){
      ctx.save();ctx.strokeStyle=style.glow;ctx.lineWidth=style.width+style.casing*2.8;ctx.setLineDash([]);ctx.shadowColor=style.glow;ctx.shadowBlur=style.glowBlur;
      for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
      ctx.restore();
    }
    if(style.outer){
      ctx.strokeStyle=style.outer;ctx.lineWidth=style.width+style.casing*2;ctx.setLineDash([]);
      for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);
    for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
    // cœur clair, discret : rappelle le balayage lumineux des écrans vectoriels.
    if(!style.dash?.length&&style.width>=1.4){
      ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=Math.max(.6,style.width*.22);ctx.setLineDash([]);
      for(const coords of paths){if(symbolicTraceNetworkPath(ctx,coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.restore();
  }
  return count;
}

function symbolicLineClass(cell){
  const cls=String(cell?.cls||"");
  if(cls.includes("c-water"))return "water";
  if(cls.includes("c-road-major"))return "major";
  if(cls.includes("c-road"))return "road";
  if(cls.includes("c-path"))return "path";
  if(cls.includes("c-parcel"))return "parcel";
  if(cls.includes("c-contour"))return "contour";
  return "";
}
function symbolicCompatibleLine(a,b){return a&&b&&(a===b||(a==="major"&&b==="road")||(a==="road"&&b==="major"));}
function symbolicLineStyle(kind,m){
  if(kind==="water")return {color:"#57cbe3",outer:"rgba(4,18,22,.75)",width:Math.max(1.35,m.cellH*.22),dash:[]};
  if(kind==="major")return {color:"#dbc986",outer:"rgba(20,16,8,.8)",width:Math.max(1.5,m.cellH*.20),dash:[]};
  if(kind==="road")return {color:"#b8a874",outer:"rgba(20,16,8,.7)",width:Math.max(.95,m.cellH*.13),dash:[]};
  if(kind==="path")return {color:"#a79572",outer:null,width:Math.max(.75,m.cellH*.08),dash:[2.5,3]};
  if(kind==="parcel")return {color:"rgba(170,191,178,.28)",outer:null,width:.65,dash:[3,3]};
  return {color:"rgba(145,166,154,.25)",outer:null,width:.65,dash:[]};
}
function symbolicDrawFallbackGridLines(ctx,grid,m){
  const dirs=[[1,0],[0,1]];
  const center=(x,y)=>({x:m.padding+(x+.5)*m.cellW,y:m.padding+(y+.5)*m.cellH});
  for(const kind of ["contour","parcel","path","road","major","water"]){
    const style=symbolicLineStyle(kind,m),segments=[];
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      if(symbolicLineClass(grid.grid[y][x])!==kind)continue;
      const a=center(x,y);let linked=false;
      for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=CONFIG.gridW||ny>=CONFIG.gridH)continue;const nk=symbolicLineClass(grid.grid[ny][nx]);if(!symbolicCompatibleLine(kind,nk))continue;segments.push([a,center(nx,ny)]);linked=true}
      if(!linked)segments.push([{x:a.x-m.cellW*.18,y:a.y},{x:a.x+m.cellW*.18,y:a.y}]);
    }
    if(!segments.length)continue;
    ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    if(style.outer){ctx.strokeStyle=style.outer;ctx.lineWidth=style.width+Math.max(1.2,m.fontSize*.09);ctx.setLineDash([]);ctx.beginPath();for(const [a,b] of segments){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke()}
    ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);ctx.beginPath();for(const [a,b] of segments){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke();ctx.restore();
  }
}
function symbolicPoiColor(kind){return ({location:"#82f4c1",home:"#ff7f8a",bss:"#f2c75c",heritage:"#eadcaa",industrial:"#f2a35d",memory:"#df8bd4",cavity:"#71dbca",natural:"#76d7c4"})[kind]||"#dce9e1"}
function symbolicPoiCode(kind){return ({location:"GPS",home:"MAI",bss:"BSS",heritage:"PAT",industrial:"FRI",memory:"OBS",cavity:"CAV",natural:"NAT"})[kind]||"POI"}
function symbolicPoiHash(value){
  let h=2166136261;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
}
function symbolicPoiLayerEnabled(poi){
  if(!poi)return false;
  if(poi.sourceType==="bss")return !!state.layerBss;
  if(poi.sourceType==="cavity"||poi.sourceType==="osm-natural")return !!state.layerCavities;
  if(poi.sourceType==="heritage")return !!state.layerHeritage&&state.heritageEnabled[poi.raw?.category]!==false;
  if(poi.sourceType==="observation")return !!state.layerObservations;
  if(poi.sourceType==="lore"||poi.sourceType==="demo")return !!state.layerLore;
  if(poi.sourceType==="cartofriches")return !!state.layerCartofriches&&(state.cartofrichesIncludeReconverted||!String(poi.raw?.status||"").toLowerCase().includes("reconvert"));
  if(poi.sourceType==="house")return !!state.layerHouse;
  if(poi.sourceType==="location")return !!state.userLocation;
  return true;
}
function symbolicPoiDepthAlpha(poi){
  if(currentDepth()===0)return 1;
  if(["cavity","bss","memory","home","location","natural"].includes(poi.category))return 1;
  return state.layerSurface ? .28 : 0;
}
function symbolicPoiDensityVisible(poi){
  const z=state.zoomIndex,h=symbolicPoiHash(poi.uid);
  if(poi.category==="bss"){
    const modulo=z===0?8:z===1?4:z===2?2:1;
    if(modulo>1&&h%modulo!==0&&!poi.raw?.piezo)return false;
  }
  if(poi.category==="natural"&&z<2&&h%(z===0?4:2)!==0)return false;
  return true;
}
function symbolicVisiblePois(grid){
  return queryNormalizedPois(grid.extent).filter(p=>symbolicPoiLayerEnabled(p)&&symbolicPoiDepthAlpha(p)>0&&symbolicPoiDensityVisible(p)).sort((a,b)=>b.priority-a.priority||symbolicPoiHash(a.uid)-symbolicPoiHash(b.uid));
}
function symbolicPoiScale(){return [0.78,0.88,0.99,1.10,1.22,1.38][state.zoomIndex]||1}
function symbolicRoundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function symbolicDrawPoiIcon(ctx,kind,cx,cy,size,alpha=1){
  const color=symbolicPoiColor(kind),r=Math.max(3.5,size*.39);ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=alpha;
  // Balise d'arpentage commune : un noyau sombre, une couronne colorée et un
  // petit cran cardinal. Les familles changent de glyphe, jamais de position.
  ctx.shadowColor=color;ctx.shadowBlur=Math.max(2,size*.22);
  ctx.fillStyle="rgba(4,12,8,.94)";ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,size*.075);
  ctx.beginPath();ctx.arc(0,0,r*1.24,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.globalAlpha=alpha*.72;ctx.beginPath();ctx.moveTo(0,-r*1.52);ctx.lineTo(0,-r*1.18);ctx.stroke();ctx.globalAlpha=alpha;
  ctx.shadowBlur=Math.max(1,size*.12);ctx.lineWidth=Math.max(1,size*.085);
  if(kind==="home"){
    ctx.beginPath();ctx.moveTo(-r*.72,0);ctx.lineTo(0,-r*.68);ctx.lineTo(r*.72,0);ctx.lineTo(r*.55,0);ctx.lineTo(r*.55,r*.60);ctx.lineTo(-r*.55,r*.60);ctx.lineTo(-r*.55,0);ctx.closePath();ctx.stroke();
  }else if(kind==="location"){
    ctx.beginPath();ctx.arc(0,0,r*.38,0,Math.PI*2);ctx.moveTo(-r*.75,0);ctx.lineTo(-r*.42,0);ctx.moveTo(r*.42,0);ctx.lineTo(r*.75,0);ctx.moveTo(0,-r*.75);ctx.lineTo(0,-r*.42);ctx.moveTo(0,r*.42);ctx.lineTo(0,r*.75);ctx.stroke();
  }else if(kind==="heritage"){
    ctx.beginPath();ctx.moveTo(0,-r*.78);ctx.lineTo(r*.72,0);ctx.lineTo(0,r*.78);ctx.lineTo(-r*.72,0);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.35,r*.12);ctx.lineTo(0,-r*.26);ctx.lineTo(r*.35,r*.12);ctx.stroke();
  }else if(kind==="bss"){
    ctx.beginPath();ctx.moveTo(0,-r*.70);ctx.lineTo(0,r*.72);ctx.moveTo(-r*.34,-r*.20);ctx.lineTo(r*.34,-r*.20);ctx.moveTo(-r*.24,r*.34);ctx.lineTo(r*.24,r*.34);ctx.stroke();
  }else if(kind==="industrial"){
    ctx.beginPath();ctx.rect(-r*.66,-r*.50,r*1.32,r);ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.66,-r*.05);ctx.lineTo(-r*.25,-r*.42);ctx.lineTo(r*.02,-r*.05);ctx.lineTo(r*.46,-r*.42);ctx.stroke();
  }else if(kind==="memory"){
    ctx.beginPath();ctx.ellipse(0,0,r*.76,r*.43,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.20,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  }else if(kind==="cavity"){
    ctx.beginPath();ctx.arc(0,r*.18,r*.65,Math.PI,0);ctx.lineTo(r*.65,r*.55);ctx.moveTo(-r*.65,r*.55);ctx.lineTo(-r*.65,r*.18);ctx.stroke();ctx.beginPath();ctx.arc(0,r*.20,r*.24,Math.PI,0);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(0,-r*.62);ctx.bezierCurveTo(r*.56,-r*.34,r*.58,r*.40,0,r*.66);ctx.bezierCurveTo(-r*.58,r*.40,-r*.56,-r*.34,0,-r*.62);ctx.stroke();
  }
  ctx.restore();
}
function symbolicPoiLabelAllowed(poi){
  if(!state.layerLabels||!poi.title)return false;
  const z=state.zoomIndex;
  if(z===0)return poi.category==="home"||poi.category==="location";
  if(z===1)return ["home","location","heritage","industrial"].includes(poi.category)&&poi.priority>=20;
  if(z===2)return poi.category!=="bss"&&poi.category!=="natural";
  if(z===3)return poi.category!=="bss"||!!poi.raw?.piezo;
  if(z===4)return poi.category!=="bss"||!!poi.raw?.piezo||!!poi.raw?.indice;
  return true;
}
function symbolicTruncateLabel(text,max){const s=String(text||"").replace(/\s+/g," ").trim();return s.length>max?s.slice(0,max-1).trimEnd()+"…":s}
function symbolicRectsOverlap(a,b,pad=2){return !(a.x+a.w+pad<b.x||b.x+b.w+pad<a.x||a.y+a.h+pad<b.y||b.y+b.h+pad<a.y)}
function symbolicDrawNonPoiLabels(ctx,grid,m,occupied=[]){
  ctx.save();ctx.textBaseline="top";ctx.textAlign="left";ctx.font=`700 ${Math.max(8,m.fontSize*.76)}px ${canvasFontFamily()}`;ctx.fillStyle="rgba(238,230,204,.82)";ctx.shadowColor="rgba(0,0,0,.95)";ctx.shadowBlur=3;
  for(let y=0;y<CONFIG.gridH;y++){
    let text="",start=0,poiLabel=false;
    const flush=()=>{if(!text)return; if(!poiLabel){const x=m.padding+start*m.cellW,yy=m.padding+y*m.cellH+m.cellH*.08,w=ctx.measureText(text).width,h=Math.max(9,m.fontSize*.82),rect={x,y:yy,w,h};if(!occupied.some(r=>symbolicRectsOverlap(r,rect,1))){ctx.fillText(text,x,yy);occupied.push(rect)}} text="";poiLabel=false};
    for(let x=0;x<=CONFIG.gridW;x++){
      const c=x<CONFIG.gridW?grid.grid[y][x]:null,isLabel=!!c&&String(c.cls||"").includes("c-label");
      if(isLabel){if(!text)start=x;text+=c.ch;poiLabel=poiLabel||!!c.feature?.poi||!!c.feature?.poiId||!!c.feature?.normalizedPoi}else flush();
    }
  }
  ctx.restore();return occupied;
}
function symbolicDrawPoiLabels(ctx,entries,m,occupied=[]){
  const z=state.zoomIndex,maxChars=[13,16,20,25,31,38][z]||26;
  ctx.save();ctx.textBaseline="middle";ctx.lineJoin="round";
  for(const entry of entries){
    const {poi,cx,cy,size,alpha}=entry;if(alpha<.55||!symbolicPoiLabelAllowed(poi))continue;
    const title=symbolicTruncateLabel(poi.title,maxChars),code=symbolicPoiCode(poi.category),color=symbolicPoiColor(poi.category),hash=symbolicPoiHash(poi.uid);
    const fontSize=Math.max(8,m.fontSize*(z>=4?.78:.70));ctx.font=`700 ${fontSize}px ${canvasFontFamily()}`;
    const codeSize=Math.max(7,fontSize*.72),codeW=Math.max(20,code.length*codeSize*.62+8),textW=ctx.measureText(title).width;
    const h=Math.ceil(fontSize+8),w=Math.ceil(codeW+textW+10),side=(hash&1)?1:-1,dy=((hash>>>1)%3-1)*Math.max(3,size*.22),gap=size*.72+5;
    const x=side>0?cx+gap:cx-gap-w,y=cy-h/2+dy,rect={x,y,w,h};
    if(x<3||x+w>m.width-3||y<3||y+h>m.height-3||occupied.some(r=>symbolicRectsOverlap(r,rect,2)))continue;
    const leaderX=side>0?x:x+w,leaderStart=cx+side*size*.48;
    ctx.globalAlpha=alpha*.82;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(leaderStart,cy);ctx.lineTo(leaderX,cy+dy);ctx.stroke();
    symbolicRoundRect(ctx,x,y,w,h,3);ctx.fillStyle="rgba(4,12,8,.92)";ctx.fill();ctx.strokeStyle=`${color}aa`;ctx.stroke();
    ctx.fillStyle=`${color}28`;ctx.fillRect(x+1,y+1,codeW-1,h-2);ctx.fillStyle=color;ctx.font=`800 ${codeSize}px ${canvasFontFamily()}`;ctx.textAlign="center";ctx.fillText(code,x+codeW/2,y+h/2+.3);
    ctx.fillStyle="#eee6cc";ctx.font=`700 ${fontSize}px ${canvasFontFamily()}`;ctx.textAlign="left";ctx.fillText(title,x+codeW+5,y+h/2+.3);
    occupied.push(rect);
  }
  ctx.restore();
}
function symbolicDrawPoisAndLabels(ctx,grid,m){
  const pois=symbolicVisiblePois(grid),scale=symbolicPoiScale(),entries=[];canvasRuntime.symbolicPoiHitRegions=[];
  for(const poi of pois){
    const p=symbolicProject(poi.lon,poi.lat,grid.extent,m);if(!p||p.x<m.padding-2||p.x>m.width-m.padding+2||p.y<m.padding-2||p.y>m.height-m.padding+2)continue;
    const alpha=symbolicPoiDepthAlpha(poi),size=Math.max(9,m.fontSize*.92)*scale;entries.push({poi,cx:p.x,cy:p.y,size,alpha});
    symbolicDrawPoiIcon(ctx,poi.category,p.x,p.y,size,alpha);
    canvasRuntime.symbolicPoiHitRegions.push({poi,cx:p.x,cy:p.y,size,alpha});
  }
  const occupied=entries.map(e=>({x:e.cx-e.size*.62,y:e.cy-e.size*.62,w:e.size*1.24,h:e.size*1.24}));
  symbolicDrawNonPoiLabels(ctx,grid,m,occupied);
  symbolicDrawPoiLabels(ctx,entries,m,occupied);
  return entries.length;
}

function symbolicPoiFeatureInfo(poi){
  const r=poi?.raw||{};
  if(!poi)return null;
  if(poi.sourceType==="cavity")return poiFeatureInfo(poi,cavityInfo(r,cavityMarker(r)));
  if(poi.sourceType==="heritage")return poiFeatureInfo(poi,heritageFeatureInfo(r));
  if(poi.sourceType==="bss")return poiFeatureInfo(poi,{kind:r.piezo?"station piézométrique":"forage ou ouvrage BSS",depth:r.depth,nature:r.nature,altitude:r.altitude,commune:r.commune,indice:r.indice,place:r.place,bss:true,piezo:!!r.piezo});
  if(poi.sourceType==="cartofriches")return poiFeatureInfo(poi,{kind:poi.kind,cartofriches:true,siteType:r.type,siteStatus:r.status,address:r.address,surface:r.surface,occupation:r.occupation,activity:r.activity,activityEnd:r.activityEnd,commune:r.commune,url:r.url});
  return poiFeatureInfo(poi,{kind:poi.kind,note:r.note||poi.description||"",description:r.description||poi.description||"",period:r.period||"",observation:poi.sourceType==="observation",lore:poi.sourceType==="lore",heritage:poi.sourceType==="heritage"});
}
function symbolicPoiRegionClientRect(region){
  const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas?.getBoundingClientRect();if(!m||!r||!region)return null;
  const sx=r.width/Math.max(1,m.width),sy=r.height/Math.max(1,m.height),radius=region.size*.68;
  return {left:r.left+(region.cx-radius)*sx,top:r.top+(region.cy-radius)*sy,right:r.left+(region.cx+radius)*sx,bottom:r.top+(region.cy+radius)*sy,width:radius*2*sx,height:radius*2*sy};
}
function symbolicPoiHitFromClient(clientX,clientY,multiplier=1){
  if(effectiveRenderMode()!=="symbolic"||!CANVAS_RENDERER||!canvasRuntime.symbolicPoiHitRegions?.length)return null;
  const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas.getBoundingClientRect();if(!m||!r.width||!r.height)return null;
  const x=(clientX-r.left)*(m.width/r.width),y=(clientY-r.top)*(m.height/r.height),coarse=coarsePointer();let best=null;
  const extra=[4,5,6,7,9,12][state.zoomIndex]||6;
  for(const region of canvasRuntime.symbolicPoiHitRegions){
    const radius=(region.size*.62+extra+(coarse?5:0))*multiplier,d=Math.hypot(x-region.cx,y-region.cy);
    if(d<=radius&&(!best||d<best.distance))best={...region,distance:d};
  }
  return best;
}
function selectSymbolicPoi(poi,note="Balise cartographique sélectionnée"){
  if(!poi||!state.lastGrid)return false;
  const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent),x=clamp(p.x,0,CONFIG.gridW-1),y=clamp(p.y,0,CONFIG.gridH-1),base=state.lastGrid.grid[y]?.[x];if(!base)return false;
  const feature=symbolicPoiFeatureInfo(poi),cell={...base,feature,cls:`${base.cls||""} c-symbolic-poi`};
  state.selectedCell={x,y,coord:{lat:poi.lat,lon:poi.lon},feature,poiUid:poi.uid};state.selectionSnapNote=note;state.selectionAssistVisible=false;
  debugState.lastSelection=`${x}, ${y} · ${poi.title}`;playCellSelectionSound(cell,{snapped:true});syncSelectionDom();updateSelectionAssist();triggerPoiSelectionFeedback(cell,x,y,{lat:poi.lat,lon:poi.lon});
  presentCellDescription(cell,x,y,{note,title:poi.title||poi.kind||"Point d’intérêt",sheet:"full"});return true;
}


/* V0.16c — profondeur symbolique cohérente.
   Les tranches utilisent la même grammaire visuelle que la surface, mais les
   couleurs distinguent clairement donnée documentée et volume interprétatif.
   La géométrie reste celle du modèle maître commun aux profondeurs. */
function symbolicUndergroundPalette(depth=currentDepth()){
  if(depth>=-3)return {base:"#101d1a",grid:"rgba(119,176,155,.055)",rock:"#172722",fracture:"rgba(140,189,170,.18)",high:"rgba(151,122,184,.72)",med:"rgba(126,99,159,.50)",low:"rgba(100,76,126,.30)",edge:"rgba(213,188,230,.58)",water:"#59cde6",pillar:"#e9bd78"};
  if(depth>=-8)return {base:"#0d191b",grid:"rgba(112,153,176,.05)",rock:"#18252a",fracture:"rgba(117,161,178,.18)",high:"rgba(137,124,190,.72)",med:"rgba(109,98,159,.50)",low:"rgba(82,73,122,.30)",edge:"rgba(196,190,236,.58)",water:"#58cce9",pillar:"#e8b879"};
  if(depth>=-14)return {base:"#10151d",grid:"rgba(124,133,184,.05)",rock:"#1c2130",fracture:"rgba(133,139,184,.18)",high:"rgba(130,112,184,.70)",med:"rgba(103,85,153,.48)",low:"rgba(79,64,116,.29)",edge:"rgba(199,181,231,.56)",water:"#56bfdf",pillar:"#ddb079"};
  if(depth>=-22)return {base:"#171418",grid:"rgba(170,130,112,.045)",rock:"#292126",fracture:"rgba(178,134,118,.16)",high:"rgba(145,102,155,.68)",med:"rgba(113,78,126,.46)",low:"rgba(85,58,95,.28)",edge:"rgba(220,169,202,.54)",water:"#4cb7d5",pillar:"#dba36f"};
  return {base:"#1b1511",grid:"rgba(183,132,91,.045)",rock:"#30231d",fracture:"rgba(190,139,96,.16)",high:"rgba(157,103,128,.66)",med:"rgba(123,78,101,.44)",low:"rgba(91,57,74,.27)",edge:"rgba(226,168,179,.52)",water:"#43aac8",pillar:"#d99a65"};
}
function symbolicUndergroundConfidence(cell){
  const cls=String(cell?.cls||"");
  if(cls.includes("c-hyp-high"))return "high";
  if(cls.includes("c-hyp-med"))return "med";
  if(cls.includes("c-hyp-low"))return "low";
  return "";
}
function symbolicDrawUndergroundBase(ctx,grid,m){
  const palette=symbolicUndergroundPalette();
  ctx.fillStyle=palette.base;ctx.fillRect(0,0,m.width,m.height);
  // Fond rocheux continu, avec une trame régulière stable plutôt qu'un bruit
  // aléatoire qui changerait de lecture entre les profondeurs.
  ctx.fillStyle=palette.rock;ctx.fillRect(m.padding,m.padding,CONFIG.gridW*m.cellW,CONFIG.gridH*m.cellH);
  ctx.strokeStyle=palette.grid;ctx.lineWidth=.55;ctx.beginPath();
  const stepX=Math.max(4,Math.round(48/Math.max(1,m.cellW))),stepY=Math.max(4,Math.round(48/Math.max(1,m.cellH)));
  for(let x=0;x<=CONFIG.gridW;x+=stepX){const px=m.padding+x*m.cellW;ctx.moveTo(px,m.padding);ctx.lineTo(px,m.padding+CONFIG.gridH*m.cellH)}
  for(let y=0;y<=CONFIG.gridH;y+=stepY){const py=m.padding+y*m.cellH;ctx.moveTo(m.padding,py);ctx.lineTo(m.padding+CONFIG.gridW*m.cellW,py)}
  ctx.stroke();
  // Fractures schématiques : traits très courts, orientation déterministe.
  ctx.strokeStyle=palette.fracture;ctx.lineWidth=Math.max(.55,m.fontSize*.04);ctx.beginPath();
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const c=grid.grid[y][x],cls=String(c?.cls||"");if(!cls.includes("c-fracture"))continue;
    const cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH,flip=(x*13+y*7)%2;
    ctx.moveTo(cx-m.cellW*.28,cy+(flip?-.18:.18)*m.cellH);ctx.lineTo(cx+m.cellW*.28,cy+(flip?.18:-.18)*m.cellH);
  }
  ctx.stroke();
}
function symbolicDrawUndergroundVolumes(ctx,grid,m){
  const palette=symbolicUndergroundPalette(),fills={high:palette.high,med:palette.med,low:palette.low};
  // Remplissage continu des volumes. Un léger chevauchement évite les coutures
  // entre cellules sans utiliser de filtre flou coûteux.
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const conf=symbolicUndergroundConfidence(grid.grid[y][x]);if(!conf)continue;
    ctx.fillStyle=fills[conf];ctx.fillRect(m.padding+x*m.cellW-.35,m.padding+y*m.cellH-.35,m.cellW+.7,m.cellH+.7);
  }
  // Un contour unique entoure les volumes, sans redessiner chaque cellule.
  ctx.strokeStyle=palette.edge;ctx.lineWidth=Math.max(.75,m.fontSize*.06);ctx.beginPath();
  const isVolume=(x,y)=>x>=0&&y>=0&&x<CONFIG.gridW&&y<CONFIG.gridH&&!!symbolicUndergroundConfidence(grid.grid[y][x]);
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    if(!isVolume(x,y))continue;
    const l=m.padding+x*m.cellW,t=m.padding+y*m.cellH,r=l+m.cellW,b=t+m.cellH;
    if(!isVolume(x,y-1)){ctx.moveTo(l,t);ctx.lineTo(r,t)}
    if(!isVolume(x+1,y)){ctx.moveTo(r,t);ctx.lineTo(r,b)}
    if(!isVolume(x,y+1)){ctx.moveTo(r,b);ctx.lineTo(l,b)}
    if(!isVolume(x-1,y)){ctx.moveTo(l,b);ctx.lineTo(l,t)}
  }
  ctx.stroke();
}
function symbolicDrawUndergroundWater(ctx,grid,m){
  const palette=symbolicUndergroundPalette(),isWater=(x,y)=>x>=0&&y>=0&&x<CONFIG.gridW&&y<CONFIG.gridH&&String(grid.grid[y][x]?.cls||"").includes("c-water-underground");
  ctx.save();ctx.strokeStyle=palette.water;ctx.fillStyle=palette.water;ctx.shadowColor=palette.water;ctx.shadowBlur=Math.max(2,m.fontSize*.22);ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=Math.max(1.2,m.cellH*.16);ctx.beginPath();
  const center=(x,y)=>({x:m.padding+(x+.5)*m.cellW,y:m.padding+(y+.5)*m.cellH});
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    if(!isWater(x,y))continue;const a=center(x,y);let linked=false;
    for(const [dx,dy] of [[1,0],[0,1]])if(isWater(x+dx,y+dy)){const b=center(x+dx,y+dy);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);linked=true}
    if(!linked){ctx.moveTo(a.x-.5,a.y);ctx.lineTo(a.x+.5,a.y)}
  }
  ctx.stroke();ctx.restore();
}
function symbolicDrawUndergroundPillarsAndGhosts(ctx,grid,m){
  const palette=symbolicUndergroundPalette();ctx.save();
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const c=grid.grid[y][x],cls=String(c?.cls||""),cx=m.padding+(x+.5)*m.cellW,cy=m.padding+(y+.5)*m.cellH;
    if(cls.includes("c-pillar")){
      const r=Math.max(2,Math.min(m.cellW,m.cellH)*.28);ctx.fillStyle="rgba(18,13,8,.9)";ctx.strokeStyle=palette.pillar;ctx.lineWidth=Math.max(1,m.fontSize*.07);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else if(cls.includes("c-ghost")&&((x+y)%3===0)){
      ctx.fillStyle="rgba(157,191,172,.18)";ctx.fillRect(cx-.6,cy-.6,1.2,1.2);
    }
  }
  ctx.restore();
}
function drawSymbolicUndergroundMap(grid,m,ctx){
  symbolicDrawUndergroundBase(ctx,grid,m);
  symbolicDrawUndergroundVolumes(ctx,grid,m);
  symbolicDrawUndergroundWater(ctx,grid,m);
  symbolicDrawUndergroundPillarsAndGhosts(ctx,grid,m);
  symbolicDrawInstrumentFrame(ctx,m);
  return symbolicDrawPoisAndLabels(ctx,grid,m);
}

/* V0.16e — réseaux nettoyés et direction artistique renforcée.
   Cette passe n'altère aucune donnée. Elle déduplique les fragments OSM au
   moment du dessin, élimine les aires routières prises pour des axes, masque
   les branchements utilitaires trop courts aux zooms où ils n'apportent rien
   et conserve une simplification indépendante du cadrage. */
function symbolicNetworkVisible(kind){
  const detail=semanticZoom(),z=state.zoomIndex;
  if(kind==="path")return !!detail.paths&&z>=3;
  if(kind==="road-minor")return !!detail.minorRoads&&z>=4;
  if(kind==="water-minor")return !!detail.minorWater&&z>=5;
  if(kind==="water")return z>=1||!!detail.minorWater;
  return true;
}
function symbolicNetworkFeatureAllowed(feature,kind,length=0){
  const t=feature?.tags||{},z=state.zoomIndex,highway=String(t.highway||"").toLowerCase();
  const name=String(t.name||t.ref||"").trim();
  const access=String(t.access||"").toLowerCase();
  const service=String(t.service||"").toLowerCase();
  if(t.area==="yes")return false;
  if(feature?.closed&&String(t.junction||"").toLowerCase()!=="roundabout")return false;
  if(["no","private","customers"].includes(access))return false;

  // Les voies de parking, accès de maison et bretelles techniques sont utiles
  // dans la base, mais illisibles dans une carte synthétique. Même au zoom max,
  // elles ne sont pas affichées par défaut.
  if(highway==="service"){
    if(["driveway","parking_aisle","emergency_access","drive-through"].includes(service))return false;
    if(z<5)return false;
    if(!name&&length<90)return false;
  }
  if(highway==="living_street"){
    if(z<5)return false;
    if(!name&&length<75)return false;
  }

  // Les chemins sont réservés aux deux niveaux les plus proches. À l'échelle
  // Site, seuls les itinéraires nommés ou réellement continus restent visibles.
  if(["footway","path","cycleway","bridleway","steps"].includes(highway)){
    if(z<4)return false;
    if(z===4&&!name)return false;
    if(!name&&length<80)return false;
  }
  if(highway==="track"){
    if(z<4)return false;
    if(z===4&&!name&&length<180)return false;
  }

  // Généralisation des rues locales. On garde toutes les données, mais pas tous
  // les fragments à toutes les échelles.
  if(["residential","unclassified"].includes(highway)){
    if(z<=2&&!name)return false;
    if(z===3&&!name&&length<220)return false;
    if(z===4&&!name&&length<85)return false;
    if(z===5&&!name&&length<45)return false;
  }
  if(kind==="road-minor"&&z<5)return false;
  if(kind==="water-minor"&&z<5)return false;
  return true;
}
function symbolicNetworkLengthMeters(coords){
  let total=0;
  for(let i=1;i<(coords?.length||0);i++){
    const a={lon:+coords[i-1][0],lat:+coords[i-1][1]},b={lon:+coords[i][0],lat:+coords[i][1]};
    if(Number.isFinite(a.lon)&&Number.isFinite(a.lat)&&Number.isFinite(b.lon)&&Number.isFinite(b.lat))total+=distanceMeters(a,b);
  }
  return total;
}
function symbolicNetworkEndpointKey(pair){
  const lon=Number(pair?.[0]),lat=Number(pair?.[1]);
  return Number.isFinite(lon)&&Number.isFinite(lat)?`${lon.toFixed(5)},${lat.toFixed(5)}`:"";
}
function symbolicNetworkGeometryKey(feature,kind){
  const coords=feature?.coords||[];if(coords.length<2)return "";
  const sample=coords.length>14?coords.filter((_,i)=>i===0||i===coords.length-1||i%Math.ceil(coords.length/12)===0):coords;
  const direct=sample.map(p=>`${Number(p[0]).toFixed(5)},${Number(p[1]).toFixed(5)}`).join("|");
  const reverse=sample.slice().reverse().map(p=>`${Number(p[0]).toFixed(5)},${Number(p[1]).toFixed(5)}`).join("|");
  return `${kind}|${direct<reverse?direct:reverse}`;
}
function symbolicNetworkCandidates(extent){
  const byId=new Map(),byGeometry=new Map();
  for(const feature of queryOsmFeatures(extent)){
    const kind=symbolicNetworkKind(feature.tags||{});if(!kind||!symbolicNetworkVisible(kind))continue;
    const length=symbolicNetworkLengthMeters(feature.coords);
    if(!symbolicNetworkFeatureAllowed(feature,kind,length))continue;
    const item={feature,kind,length};
    const idKey=feature.type==="way"&&feature.id?`way:${feature.id}`:"";
    if(idKey){
      const previous=byId.get(idKey);
      if(!previous||length>previous.length||(length===previous.length&&(feature.coords?.length||0)>(previous.feature.coords?.length||0)))byId.set(idKey,item);
    }else{
      const geometryKey=symbolicNetworkGeometryKey(feature,kind);if(!geometryKey)continue;
      const previous=byGeometry.get(geometryKey);
      if(!previous||length>previous.length)byGeometry.set(geometryKey,item);
    }
  }
  const items=[...byId.values(),...byGeometry.values()];
  // Comptage des extrémités pour repérer les petits rameaux orphelins. Cela ne
  // supprime jamais un axe nommé ou majeur, uniquement du bruit cartographique.
  const endpointUse=new Map();
  for(const item of items){
    const coords=item.feature.coords||[],a=symbolicNetworkEndpointKey(coords[0]),b=symbolicNetworkEndpointKey(coords.at(-1));
    if(a)endpointUse.set(a,(endpointUse.get(a)||0)+1);if(b)endpointUse.set(b,(endpointUse.get(b)||0)+1);
  }
  return items.filter(item=>{
    const t=item.feature.tags||{},name=String(t.name||t.ref||"").trim();
    if(name||["road-major","water-major"].includes(item.kind))return true;
    const coords=item.feature.coords||[],a=symbolicNetworkEndpointKey(coords[0]),b=symbolicNetworkEndpointKey(coords.at(-1));
    const dangling=(endpointUse.get(a)||0)<=1||(endpointUse.get(b)||0)<=1;
    const threshold=item.kind==="road"?(state.zoomIndex>=5?55:state.zoomIndex===4?95:180):item.kind==="road-minor"?120:item.kind==="path"?140:item.kind==="water-minor"?80:0;
    return !(dangling&&item.length<threshold);
  });
}
function symbolicSimplifiedCoords(feature,kind){
  const coords=feature?.coords||[];if(coords.length<=2)return coords;
  // Projection fixe à l'échelle de l'Atlas : un même way produit exactement
  // les mêmes sommets simplifiés quel que soit le centre de la fenêtre.
  const meters=symbolicFeatureMeters(coords,CONFIG.dataCenter.lat);
  const simple=symbolicSimplifyProjected(meters,symbolicNetworkToleranceMeters(kind));
  return simple.map(p=>[p.lon,p.lat]);
}
function symbolicSegmentVisibleLengthPx(coords,extent,m){
  let total=0,inside=0;
  const left=m.padding,right=m.padding+(CONFIG.gridW-1)*m.cellW+m.cellW,top=m.padding,bottom=m.padding+(CONFIG.gridH-1)*m.cellH+m.cellH;
  for(let i=1;i<(coords?.length||0);i++){
    const a=symbolicProject(coords[i-1][0],coords[i-1][1],extent,m),b=symbolicProject(coords[i][0],coords[i][1],extent,m);
    const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);
    if(maxX<left||minX>right||maxY<top||minY>bottom)continue;
    const len=Math.hypot(b.x-a.x,b.y-a.y);total+=len;
    if((a.x>left&&a.x<right&&a.y>top&&a.y<bottom)||(b.x>left&&b.x<right&&b.y>top&&b.y<bottom))inside+=len;
  }
  return {total,inside};
}
function symbolicNetworkUseful(feature,kind,coords,extent,m){
  const t=feature?.tags||{},name=String(t.name||t.ref||"").trim(),measure=symbolicSegmentVisibleLengthPx(coords,extent,m);
  if(measure.total<=0)return false;
  const base=kind==="path"?24:kind==="road-minor"?28:kind==="water-minor"?18:kind==="road"||kind==="water"?8:5;
  if(measure.total<base)return false;
  // Une courte branche interne, sans nom ni référence, est souvent une allée,
  // un tronçon partiel ou un drain qui brouille la lecture à cette échelle.
  if(!name&&measure.inside>0&&measure.inside<base*1.8&&["path","road-minor","water-minor"].includes(kind))return false;
  return true;
}
function symbolicNetworkStyle(kind,m){
  const fs=m.fontSize;
  if(kind==="water-major")return {aura:"rgba(70,218,245,.16)",auraWidth:Math.max(6.0,fs*.56),color:"#64e3f8",outer:"rgba(1,18,24,.97)",width:Math.max(2.5,fs*.255),casing:Math.max(2.0,fs*.19),highlight:"rgba(219,252,255,.52)",highlightWidth:Math.max(.58,fs*.048),dash:[]};
  if(kind==="water")return {aura:"rgba(64,201,229,.10)",auraWidth:Math.max(4.2,fs*.40),color:"#50cde4",outer:"rgba(1,18,24,.93)",width:Math.max(1.7,fs*.175),casing:Math.max(1.35,fs*.13),highlight:"rgba(197,247,252,.32)",highlightWidth:Math.max(.46,fs*.038),dash:[]};
  if(kind==="water-minor")return {aura:null,auraWidth:0,color:"rgba(96,196,216,.74)",outer:null,width:Math.max(.86,fs*.076),casing:0,highlight:null,dash:[]};
  if(kind==="road-major")return {aura:"rgba(240,211,116,.085)",auraWidth:Math.max(5.0,fs*.46),color:"#e8cf86",outer:"rgba(19,15,7,.98)",width:Math.max(2.2,fs*.22),casing:Math.max(1.8,fs*.175),highlight:"rgba(255,246,206,.34)",highlightWidth:Math.max(.48,fs*.042),dash:[]};
  if(kind==="road")return {aura:"rgba(220,192,102,.045)",auraWidth:Math.max(3.2,fs*.29),color:"#cbb474",outer:"rgba(18,15,8,.94)",width:Math.max(1.45,fs*.14),casing:Math.max(1.05,fs*.095),highlight:"rgba(255,239,181,.20)",highlightWidth:Math.max(.35,fs*.03),dash:[]};
  if(kind==="road-minor")return {aura:null,auraWidth:0,color:"rgba(180,163,113,.52)",outer:null,width:Math.max(.73,fs*.061),casing:0,highlight:null,dash:[3,3]};
  return {aura:null,auraWidth:0,color:"rgba(164,153,115,.49)",outer:null,width:Math.max(.63,fs*.053),casing:0,highlight:null,dash:[2,5]};
}
function symbolicDrawOsmNetworks(ctx,grid,m){
  if(!state.osm)return 0;
  const groups=new Map();let count=0;
  for(const item of symbolicNetworkCandidates(grid.extent)){
    const {feature,kind}=item,coords=symbolicSimplifiedCoords(feature,kind);
    if(coords.length<2||!symbolicNetworkUseful(feature,kind,coords,grid.extent,m))continue;
    if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push({coords,feature});count++;
  }
  const order=["water-minor","water","water-major","path","road-minor","road","road-major"];
  for(const kind of order){
    const paths=groups.get(kind);if(!paths?.length)continue;
    const style=symbolicNetworkStyle(kind,m);ctx.save();ctx.lineCap=kind==="path"?"butt":"round";ctx.lineJoin="round";
    if(style.aura){
      ctx.strokeStyle=style.aura;ctx.lineWidth=style.auraWidth;ctx.setLineDash([]);ctx.lineDashOffset=0;
      for(const item of paths){if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke()}
    }
    if(style.outer){
      ctx.strokeStyle=style.outer;ctx.lineWidth=style.width+style.casing*2;ctx.setLineDash([]);
      for(const item of paths){if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);
    for(const item of paths){
      // Phase stable par identifiant : les pointillés ne changent plus de motif
      // à chaque mouvement de la fenêtre.
      ctx.lineDashOffset=style.dash.length?-(symbolicPoiHash(item.feature.id||"")%17):0;
      if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke();
    }
    if(style.highlight){
      ctx.strokeStyle=style.highlight;ctx.lineWidth=style.highlightWidth;ctx.setLineDash([]);ctx.lineDashOffset=0;
      for(const item of paths){if(symbolicTraceNetworkPath(ctx,item.coords,grid.extent,m,kind))ctx.stroke()}
    }
    ctx.restore();
  }
  return count;
}

function symbolicDrawGridTerrain(ctx,grid,m){
  for(let y=0;y<CONFIG.gridH;y++){
    let start=0,last="";
    const flush=x=>{if(last)ctx.fillRect(m.padding+start*m.cellW,m.padding+y*m.cellH,(x-start)*m.cellW+.5,m.cellH+.5)};
    for(let x=0;x<=CONFIG.gridW;x++){
      const style=x<CONFIG.gridW?symbolicTerrainStyle(grid.grid[y][x]):null,fill=style?.fill||"";
      if(x===0){last=fill;start=0;ctx.fillStyle=fill}else if(fill!==last){flush(x);last=fill;start=x;ctx.fillStyle=fill}
    }
  }
  if(state.layerRelief){
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      const c=grid.grid[y][x],shade=Number(c?.shade||0);if(!Number.isFinite(c?.elev)||Math.abs(shade)<.02)continue;
      const a=Math.min(.19,Math.abs(shade)*.018);
      ctx.fillStyle=shade>0?`rgba(210,231,211,${a})`:`rgba(0,8,4,${a*.82})`;
      ctx.fillRect(m.padding+x*m.cellW,m.padding+y*m.cellH,m.cellW+.4,m.cellH+.4);
    }
  }
  // Trame d'arpentage indépendante des cellules de terrain.
  ctx.save();ctx.strokeStyle="rgba(178,202,183,.045)";ctx.lineWidth=.5;ctx.beginPath();
  const stepX=Math.max(6,Math.round(CONFIG.gridW/12)),stepY=Math.max(6,Math.round(CONFIG.gridH/10));
  for(let x=stepX;x<CONFIG.gridW;x+=stepX){const px=m.padding+x*m.cellW;ctx.moveTo(px,m.padding);ctx.lineTo(px,m.height-m.padding)}
  for(let y=stepY;y<CONFIG.gridH;y+=stepY){const py=m.padding+y*m.cellH;ctx.moveTo(m.padding,py);ctx.lineTo(m.width-m.padding,py)}
  ctx.stroke();ctx.restore();
}
function symbolicDrawCadastre(ctx,grid,m){
  const detail=semanticZoom();
  if(state.layerParcels&&detail.parcels){
    ctx.save();ctx.strokeStyle="rgba(183,197,183,.19)";ctx.lineWidth=Math.max(.45,m.fontSize*.035);ctx.setLineDash([3,4]);
    for(const indexed of queryCadastreFeatures(grid.extent,"parcel")){if(symbolicTraceCoords(ctx,indexed.feature.coords,grid.extent,m,true))ctx.stroke()}
    ctx.restore();
  }
  const cadastre=queryCadastreFeatures(grid.extent,"building"),useCadastre=state.layerCadastreBuildings&&detail.cadastreBuildings&&cadastre.length;
  if(useCadastre){
    ctx.save();ctx.translate(Math.max(.8,m.fontSize*.055),Math.max(1,m.fontSize*.07));ctx.fillStyle="rgba(1,8,5,.42)";
    for(const indexed of cadastre){if(symbolicTraceCoords(ctx,indexed.feature.coords,grid.extent,m,true))ctx.fill()}ctx.restore();
    ctx.save();ctx.fillStyle="#e4dcc2";ctx.strokeStyle="#a69d7f";ctx.lineWidth=Math.max(.55,m.fontSize*.045);
    for(const indexed of cadastre){if(!symbolicTraceCoords(ctx,indexed.feature.coords,grid.extent,m,true))continue;ctx.fill();ctx.stroke()}ctx.restore();
  }
  // Évite le double contour OSM + cadastre, particulièrement brouillon dans les
  // lotissements. OSM ne sert de repli que si le cadastre n'est pas disponible.
  if(!useCadastre&&state.osm&&detail.osmBuildings){
    ctx.save();ctx.fillStyle="rgba(229,220,194,.88)";ctx.strokeStyle="rgba(157,148,116,.94)";ctx.lineWidth=Math.max(.5,m.fontSize*.04);
    for(const f of queryOsmFeatures(grid.extent)){if(!f.tags?.building||!f.closed)continue;if(!symbolicTraceCoords(ctx,f.coords,grid.extent,m,true))continue;ctx.fill();ctx.stroke()}ctx.restore();
  }
}
function symbolicDrawInstrumentFrame(ctx,m){
  const x=m.padding-.5,y=m.padding-.5,w=Math.max(1,CONFIG.gridW*m.cellW+1),h=Math.max(1,CONFIG.gridH*m.cellH+1);
  ctx.save();ctx.strokeStyle="rgba(222,207,154,.32)";ctx.lineWidth=.8;ctx.strokeRect(x,y,w,h);ctx.strokeStyle="rgba(121,226,171,.13)";ctx.setLineDash([1,5]);ctx.strokeRect(x+3,y+3,Math.max(1,w-6),Math.max(1,h-6));ctx.setLineDash([]);
  const len=Math.max(8,m.fontSize*.78);ctx.strokeStyle="rgba(236,221,169,.56)";ctx.lineWidth=1.1;ctx.beginPath();
  for(const [cx,cy,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){ctx.moveTo(cx,cy+sy*len);ctx.lineTo(cx,cy);ctx.lineTo(cx+sx*len,cy)}ctx.stroke();
  // Petits repères d'arpentage réguliers, sans ajout d'information fictive.
  ctx.strokeStyle="rgba(222,207,154,.22)";ctx.lineWidth=.7;ctx.beginPath();
  for(let i=1;i<10;i++){
    const px=x+w*i/10,py=y+h*i/10,t=i===5?5:3;
    ctx.moveTo(px,y);ctx.lineTo(px,y+t);ctx.moveTo(px,y+h);ctx.lineTo(px,y+h-t);
    ctx.moveTo(x,py);ctx.lineTo(x+t,py);ctx.moveTo(x+w,py);ctx.lineTo(x+w-t,py);
  }
  ctx.stroke();ctx.restore();
}
function symbolicDrawCartographicFinish(ctx,m){
  ctx.save();
  const vignette=ctx.createRadialGradient(m.width*.48,m.height*.44,Math.min(m.width,m.height)*.14,m.width*.5,m.height*.5,Math.max(m.width,m.height)*.72);
  vignette.addColorStop(0,"rgba(92,255,184,.022)");vignette.addColorStop(.66,"rgba(0,0,0,.03)");vignette.addColorStop(1,"rgba(0,5,3,.25)");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,m.width,m.height);
  const wash=ctx.createLinearGradient(0,0,m.width,m.height);
  wash.addColorStop(0,"rgba(91,255,190,.024)");wash.addColorStop(.5,"rgba(255,223,135,.010)");wash.addColorStop(1,"rgba(65,205,255,.020)");
  ctx.fillStyle=wash;ctx.fillRect(0,0,m.width,m.height);
  ctx.restore();
}
function drawSymbolicCanvasMap(grid=state.lastGrid,reason="direct"){
  if(!CANVAS_RENDERER||!grid||!els.mapCanvas)return 0;
  const m=syncCanvasSize();if(!m)return 0;const frame=beginCanvasPipeline("symbolic",reason);canvasRuntime.lastGrid=grid;
  const ctx=canvasContext();ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;
  if(currentDepth()<0){
    const count=drawSymbolicUndergroundMap(grid,m,ctx);symbolicDrawCartographicFinish(ctx,m);finalizeCanvasFrame(ctx,m,"symbolic",reason,frame);ctx.globalAlpha=1;ctx.shadowBlur=0;return count
  }
  const mapCore=getComputedStyle(document.body).getPropertyValue("--map-core").trim()||"#06110c";ctx.fillStyle=mapCore;ctx.fillRect(0,0,m.width,m.height);
  symbolicDrawGridTerrain(ctx,grid,m);symbolicDrawOsmPolygons(ctx,grid,m);symbolicDrawPatterns(ctx,grid,m);symbolicDrawCadastre(ctx,grid,m);
  const networkCount=symbolicDrawOsmNetworks(ctx,grid,m);if(!networkCount)symbolicDrawFallbackGridLines(ctx,grid,m);
  symbolicDrawInstrumentFrame(ctx,m);const count=symbolicDrawPoisAndLabels(ctx,grid,m);symbolicDrawCartographicFinish(ctx,m);finalizeCanvasFrame(ctx,m,"symbolic",reason,frame);
  ctx.globalAlpha=1;ctx.shadowBlur=0;return count;
}

function drawCanvasMap(grid=state.lastGrid,reason="direct"){
  document.body.dataset.effectiveRender=effectiveRenderMode();
  return effectiveRenderMode()==="symbolic"?drawSymbolicCanvasMap(grid,reason):drawAsciiCanvasMap(grid,reason);
}
function updateRenderModeControls(){
  const symbolic=state.renderMode==="symbolic",underground=currentDepth()!==0;
  document.body.dataset.effectiveRender=effectiveRenderMode();
  els.renderModeSymbolic?.classList.toggle("active",symbolic);els.renderModeAscii?.classList.toggle("active",!symbolic);
  els.renderModeSymbolic?.setAttribute("aria-pressed",String(symbolic));els.renderModeAscii?.setAttribute("aria-pressed",String(!symbolic));
  els.renderModeSymbolic?.setAttribute("aria-disabled","false");
  if(els.renderModeHelp)els.renderModeHelp.textContent=symbolic?(underground?"Coupe symbolique active : les mêmes volumes maîtres sont comparés entre profondeurs ; couleur et opacité indiquent le degré d’interprétation.":"Surface symbolique active : les repères utilisent des balises géographiques stables, une seule icône par lieu et des cartouches documentaires séparés. Routes et cours d’eau utilisent une hiérarchie nettoyée : doublons, aires routières et branchements utilitaires parasites sont filtrés au rendu."):"Rendu ASCII historique actif à toutes les profondeurs.";
}
function setRenderMode(mode){
  state.renderMode=mode==="ascii"?"ascii":"symbolic";try{localStorage.setItem(RENDER_MODE_PREF_KEY,state.renderMode)}catch{};canvasRuntime.styleCache.clear();render("render-mode");
}
function canvasDisplayMetrics(){
  if(!CANVAS_RENDERER||!els.mapCanvas)return null;
  const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas.getBoundingClientRect();
  if(!m||!r.width||!r.height)return null;
  // Le bitmap peut être redimensionné par la mise en page, le zoom navigateur ou
  // une transformation temporaire. Tous les calculs interactifs doivent employer
  // la même géométrie réellement affichée, jamais les dimensions théoriques seules.
  const scaleX=m.width?Math.abs(r.width/m.width):1;
  const scaleY=m.height?Math.abs(r.height/m.height):1;
  return {
    m,r,scaleX,scaleY,
    paddingX:m.padding*scaleX,paddingY:m.padding*scaleY,
    cellW:m.cellW*scaleX,cellH:m.cellH*scaleY
  };
}
function canvasCellRect(x,y){
  const d=canvasDisplayMetrics();if(!d)return null;
  const left=d.r.left+d.paddingX+x*d.cellW,top=d.r.top+d.paddingY+y*d.cellH;
  return {left,top,width:d.cellW,height:d.cellH,right:left+d.cellW,bottom:top+d.cellH};
}
function positionCanvasMarker(marker,x,y,visible=true){
  if(!marker||!CANVAS_RENDERER||!els.viewport){return}
  if(!visible){marker.classList.remove("visible");return}
  const r=canvasCellRect(x,y),vr=els.viewport.getBoundingClientRect();if(!r){marker.classList.remove("visible");return}
  marker.style.left=`${r.left-vr.left+els.viewport.scrollLeft}px`;marker.style.top=`${r.top-vr.top+els.viewport.scrollTop}px`;
  marker.style.width=`${r.width}px`;marker.style.height=`${r.height}px`;marker.classList.add("visible");
}

const AUDIO_PREF_KEY="atlas-karst-audio-v1";
const retroAudio=(()=>{
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  let enabled=true,ctx=null,bus=null;
  const ONE_SHOT_BOOST=1.55;
  let panLastAt=0,panLastX=0,panLastY=0,panActive=false,panVoice=null;
  let encounterThemeTimer=null,encounterThemeFamily="",encounterThemeStep=0;
  const lastPlayAt=new Map();
  const cooldownMs={button:42,click:42,toggle:70,panel:70,panelOpen:80,panelClose:80,zoomIn:90,zoomOut:90,depthDown:120,depthUp:120,select:55,poiCavity:220,poiBss:180,poiHeritage:220,poiMemory:210,poiIndustrial:210,poiNatural:180,poiHome:220,poiLocation:180,encounterStart:300,encounterTurn:120,encounterCorrect:180,encounterWrong:180,encounterWin:500,encounterFlee:300,codexOpen:160,codexPage:90,encounterReveal:220};
  try{enabled=localStorage.getItem(AUDIO_PREF_KEY)!=="off"}catch{}

  function updateButton(){
    if(!els.audioToggle)return;
    if(!AudioCtor){
      els.audioToggle.disabled=true;
      els.audioToggle.classList.add("audio-unavailable");
      els.audioToggle.textContent="♪ indisponible";
      els.audioToggle.title="Web Audio n’est pas disponible dans ce navigateur";
      els.audioToggle.setAttribute("aria-pressed","false");
      return;
    }
    els.audioToggle.disabled=false;
    els.audioToggle.classList.remove("audio-unavailable");
    els.audioToggle.setAttribute("aria-pressed",String(enabled));
    els.audioToggle.textContent=enabled?"♪ sons":"♪ coupés";
    els.audioToggle.title=enabled?"Couper les effets sonores":"Réactiver les effets sonores";
  }

  function unlock(){
    if(!enabled||!AudioCtor)return null;
    if(ctx?.state==="closed"){ctx=null;bus=null;panVoice=null}
    if(!ctx){
      try{
        ctx=new AudioCtor({latencyHint:"interactive"});
      }catch{ctx=new AudioCtor()}
      const filter=ctx.createBiquadFilter();
      filter.type="lowpass";filter.frequency.value=3900;filter.Q.value=.42;
      const master=ctx.createGain();master.gain.value=.46;
      const compressor=ctx.createDynamicsCompressor();
      compressor.threshold.value=-20;compressor.knee.value=12;compressor.ratio.value=4.5;
      compressor.attack.value=.003;compressor.release.value=.16;
      filter.connect(master);master.connect(compressor);compressor.connect(ctx.destination);
      bus=filter;
    }
    if(ctx.state!=="running"){
      try{ctx.resume()?.catch?.(()=>{})}catch{}
    }
    return ctx;
  }

  function tone(c,freq,duration=.06,delay=0,{to=null,type="square",gain=.03,pan=0}={}){
    if(!c||!bus)return;
    const start=c.currentTime+Math.max(0,delay),end=start+Math.max(.018,duration);
    const osc=c.createOscillator(),amp=c.createGain();
    const panner=typeof c.createStereoPanner==="function"?c.createStereoPanner():null;
    osc.type=type;osc.frequency.setValueAtTime(Math.max(35,freq),start);
    if(Number.isFinite(to))osc.frequency.exponentialRampToValueAtTime(Math.max(35,to),end);
    amp.gain.setValueAtTime(.0001,start);
    amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain*ONE_SHOT_BOOST),start+.005);
    amp.gain.exponentialRampToValueAtTime(.0001,end);
    if(panner){panner.pan.setValueAtTime(Math.max(-1,Math.min(1,pan)),start);osc.connect(amp);amp.connect(panner);panner.connect(bus)}
    else{osc.connect(amp);amp.connect(bus)}
    osc.onended=()=>{try{osc.disconnect();amp.disconnect();panner?.disconnect()}catch{}};
    osc.start(start);osc.stop(end+.025);
  }

  function noise(c,duration=.06,delay=0,{gain=.014,highpass=700,pan=0}={}){
    if(!c||!bus)return;
    const rate=c.sampleRate,length=Math.max(1,Math.floor(rate*duration));
    const buffer=c.createBuffer(1,length,rate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),amp=c.createGain();
    const panner=typeof c.createStereoPanner==="function"?c.createStereoPanner():null;
    filter.type="highpass";filter.frequency.value=highpass;
    const start=c.currentTime+Math.max(0,delay),end=start+duration;
    amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain*ONE_SHOT_BOOST,start+.004);amp.gain.exponentialRampToValueAtTime(.0001,end);
    source.buffer=buffer;source.connect(filter);filter.connect(amp);
    if(panner){panner.pan.value=Math.max(-1,Math.min(1,pan));amp.connect(panner);panner.connect(bus)}else amp.connect(bus);
    source.onended=()=>{try{source.disconnect();filter.disconnect();amp.disconnect();panner?.disconnect()}catch{}};
    source.start(start);source.stop(end+.02);
  }

  function perform(c,name){
    switch(name){
      case "select":
      case "cellTerrain":
        tone(c,610,.05,0,{type:"triangle",gain:.032});tone(c,790,.055,.044,{type:"square",gain:.022});break;
      case "snapAccent":
        tone(c,980,.045,0,{type:"square",gain:.021});tone(c,1320,.055,.037,{type:"triangle",gain:.018});break;
      case "cellWater":
        tone(c,720,.055,0,{to:560,type:"triangle",gain:.028,pan:-.25});tone(c,510,.07,.045,{to:350,type:"triangle",gain:.025,pan:.25});tone(c,860,.035,.09,{type:"square",gain:.014});break;
      case "cellRoad":
        tone(c,300,.035,0,{type:"square",gain:.031,pan:-.25});tone(c,440,.035,.045,{type:"square",gain:.028,pan:.25});break;
      case "cellBuilding":
        tone(c,175,.06,0,{type:"square",gain:.037});tone(c,350,.045,.035,{type:"triangle",gain:.025});break;
      case "cellForest":
        noise(c,.055,0,{gain:.017,highpass:1150,pan:-.2});tone(c,260,.08,.012,{to:340,type:"triangle",gain:.024});tone(c,420,.04,.075,{type:"square",gain:.014,pan:.25});break;
      case "cellField":
        tone(c,470,.065,0,{type:"triangle",gain:.024});tone(c,590,.065,.055,{type:"triangle",gain:.021});break;
      case "cellQuarry":
        tone(c,190,.09,0,{to:125,type:"sawtooth",gain:.031});noise(c,.07,.045,{gain:.013,highpass:520});break;
      case "cellCavity":
        tone(c,430,.16,0,{to:105,type:"triangle",gain:.038});tone(c,215,.12,.085,{to:92,type:"square",gain:.018});tone(c,540,.035,.19,{type:"triangle",gain:.012});break;
      case "cellBss":
        tone(c,930,.04,0,{type:"square",gain:.025});tone(c,465,.07,.055,{type:"triangle",gain:.027});tone(c,230,.09,.13,{type:"triangle",gain:.021});break;
      case "cellHeritage":
        tone(c,523,.07,0,{type:"triangle",gain:.027});tone(c,659,.07,.068,{type:"triangle",gain:.026});tone(c,784,.1,.136,{type:"triangle",gain:.029});break;
      case "cellMemory":
        tone(c,392,.07,0,{type:"triangle",gain:.025});tone(c,523,.095,.065,{type:"triangle",gain:.027});tone(c,659,.05,.145,{type:"square",gain:.014});break;
      case "cellIndustrial":
        tone(c,165,.055,0,{type:"sawtooth",gain:.032});tone(c,220,.04,.052,{type:"square",gain:.021});noise(c,.05,.083,{gain:.012,highpass:800});break;
      case "cellHome":
        tone(c,330,.05,0,{type:"triangle",gain:.027});tone(c,495,.05,.045,{type:"triangle",gain:.026});tone(c,660,.085,.09,{type:"triangle",gain:.027});break;
      case "cellUnderground":
        tone(c,145,.13,0,{to:92,type:"triangle",gain:.034});tone(c,220,.06,.04,{type:"square",gain:.016});break;
      case "poiCavity":
        tone(c,680,.28,0,{to:150,type:"triangle",gain:.064,pan:-.28});
        tone(c,340,.32,.075,{to:82,type:"square",gain:.046,pan:.28});
        noise(c,.13,.035,{gain:.024,highpass:360});
        tone(c,920,.055,.29,{to:720,type:"triangle",gain:.032});break;
      case "poiBss":
        tone(c,1080,.055,0,{type:"square",gain:.058,pan:-.3});
        tone(c,540,.085,.065,{type:"triangle",gain:.052,pan:.3});
        tone(c,1320,.06,.155,{type:"square",gain:.056,pan:-.12});
        tone(c,330,.12,.21,{to:240,type:"triangle",gain:.038});break;
      case "poiHeritage":
        tone(c,392,.095,0,{type:"triangle",gain:.051,pan:-.3});
        tone(c,523,.095,.075,{type:"triangle",gain:.054,pan:-.1});
        tone(c,659,.105,.15,{type:"triangle",gain:.056,pan:.12});
        tone(c,784,.145,.225,{type:"square",gain:.049,pan:.3});break;
      case "poiMemory":
        tone(c,330,.12,0,{type:"triangle",gain:.048,pan:-.24});
        tone(c,440,.13,.085,{type:"triangle",gain:.052});
        tone(c,660,.15,.175,{to:570,type:"square",gain:.041,pan:.24});
        noise(c,.08,.12,{gain:.014,highpass:1250});break;
      case "poiIndustrial":
        tone(c,150,.16,0,{to:92,type:"sawtooth",gain:.064,pan:-.25});
        tone(c,300,.07,.06,{type:"square",gain:.052,pan:.25});
        noise(c,.13,.09,{gain:.029,highpass:480});
        tone(c,205,.11,.19,{to:135,type:"square",gain:.044});break;
      case "poiNatural":
        noise(c,.09,0,{gain:.019,highpass:1550,pan:-.25});
        tone(c,510,.15,.015,{to:920,type:"triangle",gain:.052,pan:-.18});
        tone(c,760,.12,.12,{to:1120,type:"triangle",gain:.046,pan:.22});
        tone(c,1240,.055,.245,{type:"square",gain:.038});break;
      case "poiHome":
        tone(c,330,.095,0,{type:"triangle",gain:.052,pan:-.3});
        tone(c,495,.095,.072,{type:"triangle",gain:.054,pan:-.1});
        tone(c,660,.105,.144,{type:"triangle",gain:.056,pan:.12});
        tone(c,990,.15,.216,{type:"triangle",gain:.052,pan:.3});break;
      case "poiLocation":
        tone(c,1260,.065,0,{to:920,type:"square",gain:.058});
        tone(c,630,.12,.075,{to:520,type:"triangle",gain:.048});
        tone(c,1260,.055,.19,{type:"square",gain:.052});break;
      case "poiConfirm":
        tone(c,880,.075,0,{type:"square",gain:.052});
        tone(c,1175,.11,.07,{type:"triangle",gain:.056});break;
      case "encounterStart":
        noise(c,.15,0,{gain:.032,highpass:520});tone(c,147,.11,0,{type:"square",gain:.06,pan:-.35});tone(c,220,.11,.075,{type:"square",gain:.062,pan:-.1});tone(c,294,.12,.15,{type:"square",gain:.064,pan:.12});tone(c,440,.19,.23,{type:"triangle",gain:.072,pan:.32});break;
      case "encounterFamilyFaune":
        tone(c,880,.045,0,{to:1175,type:"square",gain:.042,pan:-.32});tone(c,1320,.05,.055,{to:990,type:"triangle",gain:.045,pan:.28});noise(c,.045,.08,{gain:.012,highpass:2100});break;
      case "encounterFamilyFlore":
        tone(c,330,.09,0,{to:440,type:"triangle",gain:.038,pan:-.28});tone(c,494,.10,.07,{to:659,type:"triangle",gain:.043});tone(c,784,.11,.15,{type:"square",gain:.038,pan:.28});break;
      case "encounterFamilyGeologie":
        noise(c,.11,0,{gain:.018,highpass:280});tone(c,110,.18,0,{to:82,type:"sawtooth",gain:.045,pan:-.2});tone(c,165,.16,.08,{to:110,type:"triangle",gain:.04,pan:.22});break;
      case "encounterFamilyPatrimoine":
        tone(c,392,.09,0,{type:"triangle",gain:.042,pan:-.3});tone(c,523,.10,.075,{type:"triangle",gain:.046});tone(c,784,.16,.15,{type:"square",gain:.048,pan:.3});break;
      case "encounterReveal":
        tone(c,1046,.045,0,{type:"square",gain:.038,pan:-.35});tone(c,1318,.045,.055,{type:"square",gain:.04});tone(c,1568,.08,.11,{type:"triangle",gain:.045,pan:.35});break;
      case "encounterTurn":
        tone(c,330,.045,0,{type:"square",gain:.038,pan:-.25});tone(c,440,.045,.042,{type:"square",gain:.04});tone(c,550,.065,.084,{type:"triangle",gain:.044,pan:.25});break;
      case "encounterCorrect":
        noise(c,.055,0,{gain:.018,highpass:1800});tone(c,523,.075,0,{type:"square",gain:.068,pan:-.35});tone(c,659,.075,.06,{type:"square",gain:.07});tone(c,784,.085,.12,{type:"square",gain:.072,pan:.2});tone(c,1046,.14,.18,{type:"triangle",gain:.078,pan:.35});break;
      case "encounterWrong":
        noise(c,.10,0,{gain:.026,highpass:420});tone(c,330,.11,0,{to:190,type:"sawtooth",gain:.066,pan:-.2});tone(c,165,.17,.075,{to:82,type:"square",gain:.052,pan:.22});break;
      case "encounterWin":
        tone(c,392,.095,0,{type:"square",gain:.072,pan:-.35});tone(c,523,.095,.075,{type:"square",gain:.074,pan:-.15});tone(c,659,.105,.15,{type:"square",gain:.076,pan:.08});tone(c,784,.11,.23,{type:"square",gain:.078,pan:.25});tone(c,1046,.22,.31,{type:"triangle",gain:.084,pan:.38});noise(c,.16,.30,{gain:.022,highpass:1900});break;
      case "encounterFlee":
        tone(c,659,.11,0,{to:440,type:"triangle",gain:.058,pan:-.25});tone(c,392,.14,.08,{to:220,type:"square",gain:.052});tone(c,220,.21,.17,{to:82,type:"triangle",gain:.046,pan:.28});noise(c,.14,.15,{gain:.02,highpass:950});break;
      case "codexOpen":
        noise(c,.07,0,{gain:.018,highpass:1200,pan:-.3});tone(c,720,.06,.025,{type:"square",gain:.044});tone(c,960,.08,.082,{type:"triangle",gain:.05,pan:.25});break;
      case "codexPage":
        noise(c,.045,0,{gain:.014,highpass:1450,pan:-.22});tone(c,580,.04,.025,{type:"triangle",gain:.032});tone(c,760,.055,.06,{type:"square",gain:.035,pan:.2});break;
      case "zoomIn":tone(c,360,.12,0,{to:820,type:"square",gain:.031});break;
      case "zoomOut":tone(c,820,.12,0,{to:330,type:"square",gain:.03});break;
      case "depthDown":
        tone(c,300,.17,0,{to:90,type:"triangle",gain:.041});tone(c,145,.1,.065,{type:"square",gain:.019});break;
      case "depthUp":
        tone(c,115,.16,0,{to:470,type:"triangle",gain:.039});tone(c,560,.05,.12,{type:"square",gain:.021});break;
      case "sync":
        tone(c,260,.06,0,{type:"triangle",gain:.029});tone(c,390,.07,.072,{type:"triangle",gain:.03});break;
      case "success":
        tone(c,440,.07,0,{type:"square",gain:.025});tone(c,660,.07,.07,{type:"square",gain:.024});tone(c,880,.11,.14,{type:"triangle",gain:.031});break;
      case "error":
        tone(c,220,.17,0,{to:100,type:"sawtooth",gain:.032});tone(c,120,.13,.08,{type:"square",gain:.021});break;
      case "panelOpen":
        tone(c,420,.045,0,{type:"triangle",gain:.024});tone(c,610,.055,.038,{type:"square",gain:.021});break;
      case "panelClose":
        tone(c,610,.045,0,{type:"triangle",gain:.023});tone(c,390,.055,.038,{type:"square",gain:.02});break;
      case "panel":
        tone(c,470,.045,0,{type:"triangle",gain:.024});tone(c,610,.045,.036,{type:"triangle",gain:.02});break;
      case "home":
        tone(c,330,.05,0,{type:"triangle",gain:.027});tone(c,495,.05,.045,{type:"triangle",gain:.026});tone(c,660,.075,.09,{type:"triangle",gain:.025});break;
      case "export":tone(c,760,.06,0,{to:520,type:"triangle",gain:.028});tone(c,980,.065,.07,{type:"square",gain:.02});break;
      case "delete":tone(c,260,.075,0,{to:165,type:"square",gain:.026});break;
      case "toggle":tone(c,520,.04,0,{type:"square",gain:.021});tone(c,690,.03,.038,{type:"triangle",gain:.015});break;
      case "button":
      case "click":
        tone(c,390,.032,0,{type:"square",gain:.022});tone(c,520,.026,.025,{type:"triangle",gain:.015});break;
      case "panStart":
        tone(c,240,.04,0,{to:310,type:"square",gain:.019});break;
      case "panEnd":
        tone(c,330,.045,0,{to:250,type:"triangle",gain:.019});break;
      case "enable":
        tone(c,660,.055,0,{type:"square",gain:.024});tone(c,990,.09,.055,{type:"triangle",gain:.029});break;
      default:tone(c,430,.04,0,{type:"triangle",gain:.02});
    }
  }

  function play(name="button"){
    if(!enabled||!AudioCtor||document.hidden)return;
    const now=performance.now(),cooldown=cooldownMs[name]??28,last=lastPlayAt.get(name)||0;
    if(now-last<cooldown)return;
    lastPlayAt.set(name,now);
    const c=unlock();if(!c)return;
    const run=()=>{if(enabled&&c.state==="running"){try{perform(c,name)}catch{}}};
    if(c.state==="running")run();
    else{try{c.resume().then(run).catch(()=>{})}catch{}}
  }

  function stopPanVoice(c=ctx){
    const voice=panVoice;panVoice=null;
    if(!voice||!c)return;
    const t=c.currentTime;
    try{
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(Math.max(.0001,voice.gain.gain.value),t);
      voice.gain.gain.exponentialRampToValueAtTime(.0001,t+.075);
      voice.osc.stop(t+.085);
    }catch{}
  }
  function startPanVoice(c){
    if(!c||c.state!=="running"||panVoice)return;
    try{
      const osc=c.createOscillator(),gain=c.createGain();
      const panner=typeof c.createStereoPanner==="function"?c.createStereoPanner():null;
      osc.type="square";osc.frequency.value=205;gain.gain.value=.0001;
      osc.connect(gain);if(panner){gain.connect(panner);panner.connect(bus)}else gain.connect(bus);
      osc.onended=()=>{try{osc.disconnect();gain.disconnect();panner?.disconnect()}catch{}};
      osc.start();gain.gain.exponentialRampToValueAtTime(.007,c.currentTime+.045);
      panVoice={osc,gain,panner};
    }catch{}
  }
  function panStart(){
    if(!enabled||panActive)return;
    panActive=true;panLastAt=0;panLastX=0;panLastY=0;
    const c=unlock();
    if(c?.state==="running")startPanVoice(c);else c?.resume?.().then(()=>startPanVoice(c)).catch(()=>{});
    play("panStart");
  }
  function panMove(dx,dy){
    if(!enabled||!panActive)return;
    const c=unlock();if(!c)return;
    const now=performance.now();if(now-panLastAt<42)return;
    if(c.state==="running"&&!panVoice)startPanVoice(c);
    const vx=dx-panLastX,vy=dy-panLastY,speed=Math.min(1,Math.hypot(vx,vy)/24);
    const horizontal=Math.max(-1,Math.min(1,vx/24)),base=175+speed*155+(Math.abs(Math.round(dx+dy))%3)*12;
    if(panVoice){
      const t=c.currentTime;
      try{
        panVoice.osc.frequency.setTargetAtTime(base*(vy<0?1.06:.96),t,.025);
        panVoice.gain.gain.setTargetAtTime(.004+speed*.009,t,.035);
        panVoice.panner?.pan.setTargetAtTime(horizontal,t,.035);
      }catch{}
    }
    panLastAt=now;panLastX=dx;panLastY=dy;
  }
  function panEnd(){
    if(!panActive)return;
    panActive=false;stopPanVoice();play("panEnd");
  }

  function stopEncounterTheme(){
    if(encounterThemeTimer){clearInterval(encounterThemeTimer);encounterThemeTimer=null}
    encounterThemeFamily="";encounterThemeStep=0;
  }
  function encounterThemePulse(){
    if(!enabled||document.hidden||!encounterThemeFamily)return;
    const c=unlock();if(!c||c.state!=="running")return;
    const patterns={
      faune:[[330,495],[392,587],[440,660],[294,440]],
      flore:[[262,392],[294,440],[330,494],[247,370]],
      geologie:[[110,165],[123,185],[98,147],[130,195]],
      patrimoine:[[392,523],[440,587],[494,659],[349,523]],
      codex:[[523,784],[587,880],[494,740],[659,988]]
    };
    const pattern=patterns[encounterThemeFamily]||patterns.codex,pair=pattern[encounterThemeStep++%pattern.length];
    tone(c,pair[0],.16,0,{type:"triangle",gain:.0065,pan:-.24});
    tone(c,pair[1],.12,.12,{type:"square",gain:.0048,pan:.24});
  }
  function startEncounterTheme(family="codex"){
    stopEncounterTheme();encounterThemeFamily=family||"codex";encounterThemeStep=0;
    encounterThemePulse();encounterThemeTimer=setInterval(encounterThemePulse,2350);
  }
  function silence(){stopPanVoice();stopEncounterTheme();panActive=false}
  function setEnabled(value,{chime=true}={}){
    enabled=!!value;
    if(!enabled)silence();
    try{localStorage.setItem(AUDIO_PREF_KEY,enabled?"on":"off")}catch{}
    updateButton();
    if(enabled&&chime)play("enable");
  }
  function toggle(){setEnabled(!enabled)}
  function init(){updateButton()}
  return {init,play,unlock,panStart,panMove,panEnd,silence,toggle,setEnabled,startEncounterTheme,stopEncounterTheme,get enabled(){return enabled}};
})();

const operationSoundWatches=new Map();
function armOperationSound(statusEl,timeoutMs=300000){
  if(!statusEl)return;
  operationSoundWatches.set(statusEl,{until:Date.now()+timeoutMs,last:text(statusEl.textContent).trim()});
}
function operationSoundOutcome(statusEl){
  const label=text(statusEl?.textContent).toLowerCase();
  if(statusEl?.classList.contains("bad")||/échec|erreur|refus|impossible/.test(label))return "error";
  if(statusEl?.classList.contains("ok")&&!/chargement|synchronisation|test|attente|tentative/.test(label))return "success";
  return "";
}
const operationStatusObserver=new MutationObserver(()=>{
  for(const [statusEl,watch] of [...operationSoundWatches]){
    if(Date.now()>watch.until){operationSoundWatches.delete(statusEl);continue}
    const current=text(statusEl.textContent).trim();
    if(current===watch.last)continue;
    watch.last=current;
    const outcome=operationSoundOutcome(statusEl);
    if(outcome){operationSoundWatches.delete(statusEl);retroAudio.play(outcome)}
  }
});

function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function escAttr(s){return esc(s).replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function safeExternalUrl(value){try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:""}catch{return ""}}
function text(v,fallback=""){return typeof v==="string"?v:(v==null?fallback:String(v))}
function cavityType(c){return text(c?.type||c?.TYPE_CAV||c?.nature||c?.detail,"indéterminé").trim().toLowerCase()||"indéterminé"}
function cavityName(c){return text(c?.name||c?.nomCavite||c?.id,"Cavité sans nom")}
function distanceMeters(a,b){
  const lat1=rad(a.lat),lat2=rad(b.lat),dlat=lat2-lat1,dlon=rad(b.lon-a.lon);
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

// Compatibilité avec les anciens instantanés : l’ancien mode Explorateur a été
// retiré de l’interface. Tous les repères documentés sont désormais visibles.
function explorerMarkerState(){return "known"}
function explorerFeatureId(feature,prefix="feature"){
  return `${prefix}:${feature?.id||feature?.name||feature?.kind||"unknown"}`;
}
function explorerMarkDiscovered(){return false}
function renderExplorerJournal(){}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rad(v){return v*Math.PI/180}
function kmPerLon(lat){return 111.32*Math.cos(rad(lat))}
function currentZoom(){
  const base=CONFIG.zooms[state.zoomIndex];
  // L'emprise adopte désormais le ratio visuel réel de la grille sur desktop
  // comme sur mobile. L'aire nominale du niveau est préservée : on gagne du
  // panorama, sans étirer la géographie ni modifier la quantité de territoire.
  try{
    const metrics=measureCanvasLayout();
    const visualRatio=(CONFIG.gridW*Math.max(1,metrics.cellW))/(CONFIG.gridH*Math.max(1,metrics.cellH));
    const area=Math.max(1e-6,base.widthKm*base.heightKm);
    const widthKm=Math.sqrt(area*Math.max(.24,visualRatio));
    const heightKm=area/Math.max(.001,widthKm);
    return {...base,widthKm,heightKm};
  }catch{return base}
}
function currentDepth(){return CONFIG.depths[state.depthIndex]}
function depthSliceMeta(depth=currentDepth()){
  if(depth===0)return {label:"surface",range:"surface",approx:false};
  const ranges={"-3":"environ 0 à 5 m","-8":"environ 5 à 11 m","-14":"environ 11 à 18 m","-22":"environ 18 à 29 m","-35":"environ 29 à 45 m"};
  return {label:`≈ ${depth} m`,range:ranges[String(depth)]||"profondeur interprétative",approx:true};
}
function depthSliceLabel(depth=currentDepth()){return depthSliceMeta(depth).label}
function documentedCavityDepth(c){
  const values=[c?.depth,c?.profondeur,c?.profondeur_m,c?.depth_m,c?.prof_m,c?.z];
  for(const raw of values){
    const n=Number(String(raw??"").replace(",","."));
    if(Number.isFinite(n)&&Math.abs(n)>.25)return -Math.abs(n);
  }
  return null;
}

// Le zoom ne grossit pas seulement la carte : il ouvre progressivement ses couches de lecture.
// Les quotas évitent qu'une vue très dense se transforme en brouillard typographique.
const SEMANTIC_ZOOM_LEVELS = [
  {
    summary:"grandes structures, relief, eau et axes majeurs · repères sous forme d’icônes",
    placeTypes:new Set(["city","town"]), placeLabel:18, placeMax:4,
    poiLabel:0, poiMax:0, bssLabel:0, bssMax:0,
    fineLand:false, minorRoads:false, paths:false, minorWater:false,
    osmBuildings:false, cadastreBuildings:false, parcels:false, observationGeometry:false
  },
  {
    summary:"villages, routes locales et emprises paysagères · points d’intérêt encore sans nom",
    placeTypes:new Set(["city","town","village"]), placeLabel:20, placeMax:8,
    poiLabel:0, poiMax:0, bssLabel:0, bssMax:0,
    fineLand:true, minorRoads:true, paths:false, minorWater:true,
    osmBuildings:false, cadastreBuildings:false, parcels:false, observationGeometry:false
  },
  {
    summary:"hameaux, chemins, bâtiments OSM et repères documentaires · noms des POI encore masqués",
    placeTypes:new Set(["city","town","village","hamlet","suburb","neighbourhood"]), placeLabel:22, placeMax:12,
    poiLabel:0, poiMax:0, bssLabel:0, bssMax:0,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:false, parcels:false, observationGeometry:true
  },
  {
    summary:"noms courts des cavités, friches et repères · bâti cadastral et géométries locales",
    placeTypes:null, placeLabel:24, placeMax:14,
    poiLabel:18, poiMax:12, bssLabel:0, bssMax:0,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:true, parcels:false, observationGeometry:true
  },
  {
    summary:"noms étendus, limites de parcelles activables et premiers identifiants BSS",
    placeTypes:null, placeLabel:28, placeMax:16,
    poiLabel:24, poiMax:20, bssLabel:15, bssMax:8,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:true, parcels:true, observationGeometry:true
  },
  {
    summary:"lecture complète : noms longs, identifiants BSS et détails de proximité",
    placeTypes:null, placeLabel:34, placeMax:20,
    poiLabel:32, poiMax:30, bssLabel:26, bssMax:16,
    fineLand:true, minorRoads:true, paths:true, minorWater:true,
    osmBuildings:true, cadastreBuildings:true, parcels:true, observationGeometry:true
  }
];
function semanticZoom(){return SEMANTIC_ZOOM_LEVELS[state.zoomIndex]||SEMANTIC_ZOOM_LEVELS.at(-1)}
function extentFor(center=state.center,z=currentZoom()){
  const dLat=(z.heightKm/111.32)/2;
  const dLon=(z.widthKm/kmPerLon(center.lat))/2;
  return {west:center.lon-dLon,east:center.lon+dLon,south:center.lat-dLat,north:center.lat+dLat};
}
function largestExtent(){
  return extentFor(CONFIG.dataCenter,{widthKm:CONFIG.dataWidthKm,heightKm:CONFIG.dataHeightKm});
}
function visibleWorldBoundaries(extent=state.lastGrid?.extent){
  if(!extent)return {north:false,east:false,south:false,west:false};
  const world=largestExtent();
  const epsLon=Math.max(1e-8,(extent.east-extent.west)/Math.max(1,CONFIG.gridW-1)*.35);
  const epsLat=Math.max(1e-8,(extent.north-extent.south)/Math.max(1,CONFIG.gridH-1)*.35);
  return {
    north:Math.abs(extent.north-world.north)<=epsLat,
    east:Math.abs(extent.east-world.east)<=epsLon,
    south:Math.abs(extent.south-world.south)<=epsLat,
    west:Math.abs(extent.west-world.west)<=epsLon
  };
}
function updateWorldBoundaryFrame(){
  const frame=els.worldBoundaryFrame,surface=activeMapSurface();
  if(!frame||!state.lastGrid||!surface||!els.viewport){frame?.classList.remove("visible");return}
  const flags=visibleWorldBoundaries(state.lastGrid.extent),active=Object.values(flags).some(Boolean);
  frame.classList.toggle("visible",active);
  for(const side of ["north","east","south","west"])frame.querySelector(`.edge-${side}`)?.classList.toggle("active",!!flags[side]);
  if(!active)return;

  const vr=els.viewport.getBoundingClientRect();
  let first,last;
  if(CANVAS_RENDERER){
    first=canvasCellRect(0,0);last=canvasCellRect(CONFIG.gridW-1,CONFIG.gridH-1);
  }else{
    const a=els.map.querySelector('.cell[data-x="0"][data-y="0"]')?.getBoundingClientRect();
    const b=els.map.querySelector(`.cell[data-x="${CONFIG.gridW-1}"][data-y="${CONFIG.gridH-1}"]`)?.getBoundingClientRect();
    if(a&&b)first={left:a.left,top:a.top,right:a.right,bottom:a.bottom},last={left:b.left,top:b.top,right:b.right,bottom:b.bottom};
  }
  if(!first||!last){frame.classList.remove("visible");return}

  // La fiche mobile peut recouvrir le bas du viewport. Le cadre est alors
  // rabattu juste au-dessus de la fiche, au lieu de disparaître dessous.
  let visibleBottom=vr.bottom;
  if(mobileReadoutMode()&&els.readout&&!document.body.classList.contains("info-collapsed")){
    const rr=els.readout.getBoundingClientRect();
    const overlaps=rr.left<vr.right&&rr.right>vr.left&&rr.top<vr.bottom&&rr.bottom>vr.top;
    if(overlaps)visibleBottom=Math.max(vr.top+8,Math.min(visibleBottom,rr.top-4));
  }

  const mapLeft=first.left,mapTop=first.top,mapRight=last.right,mapBottom=last.bottom;
  const left=Math.max(vr.left,Math.min(mapLeft,vr.right-1));
  const right=Math.min(vr.right,Math.max(mapRight,vr.left+1));
  const top=Math.max(vr.top,Math.min(mapTop,visibleBottom-1));
  const bottom=Math.min(visibleBottom,Math.max(mapBottom,vr.top+1));
  if(right<=left||bottom<=top){frame.classList.remove("visible");return}

  frame.style.left=`${left-vr.left+els.viewport.scrollLeft}px`;
  frame.style.top=`${top-vr.top+els.viewport.scrollTop}px`;
  frame.style.width=`${Math.max(1,right-left)}px`;
  frame.style.height=`${Math.max(1,bottom-top)}px`;
  frame.dataset.southClamped=String(flags.south&&mapBottom>visibleBottom+1);
}
function clampCenter(center,z=currentZoom()){
  const b=largestExtent();
  const halfLat=(z.heightKm/111.32)/2;
  const halfLon=(z.widthKm/kmPerLon(center.lat))/2;
  const minLat=b.south+halfLat,maxLat=b.north-halfLat;
  const minLon=b.west+halfLon,maxLon=b.east-halfLon;
  return {
    lat:minLat<=maxLat?clamp(center.lat,minLat,maxLat):CONFIG.dataCenter.lat,
    lon:minLon<=maxLon?clamp(center.lon,minLon,maxLon):CONFIG.dataCenter.lon
  };
}
function coordToGrid(lat,lon,extent){
  const x=Math.round((lon-extent.west)/(extent.east-extent.west)*(CONFIG.gridW-1));
  const y=Math.round((extent.north-lat)/(extent.north-extent.south)*(CONFIG.gridH-1));
  return {x,y};
}
function gridToCoord(x,y,extent){
  return {
    lon:extent.west+(x/(CONFIG.gridW-1))*(extent.east-extent.west),
    lat:extent.north-(y/(CONFIG.gridH-1))*(extent.north-extent.south)
  };
}
function inExtent(lat,lon,e){return lat>=e.south&&lat<=e.north&&lon>=e.west&&lon<=e.east}

/* V0.12d — socle commun des points d’intérêt et indexation spatiale.
   Les sources conservent leurs données brutes, mais le moteur ne les parcourt
   plus toutes à chaque rendu. Un index géographique léger fournit uniquement
   les objets présents dans l’emprise courante. */
class SpatialHashIndex{
  constructor(cellDegrees=.012){this.cellDegrees=cellDegrees;this.buckets=new Map();this.overflow=[];this.count=0}
  clear(){this.buckets.clear();this.overflow=[];this.count=0}
  key(ix,iy){return `${ix}:${iy}`}
  range(bounds){
    const s=this.cellDegrees;
    return {
      x1:Math.floor(bounds.west/s),x2:Math.floor(bounds.east/s),
      y1:Math.floor(bounds.south/s),y2:Math.floor(bounds.north/s)
    };
  }
  insert(item,bounds){
    if(!bounds||![bounds.west,bounds.east,bounds.south,bounds.north].every(Number.isFinite))return;
    const r=this.range(bounds);this.count++;
    const cells=(r.x2-r.x1+1)*(r.y2-r.y1+1);
    if(cells>2048){this.overflow.push(item);return}
    for(let iy=r.y1;iy<=r.y2;iy++)for(let ix=r.x1;ix<=r.x2;ix++){
      const k=this.key(ix,iy),bucket=this.buckets.get(k);
      if(bucket)bucket.push(item);else this.buckets.set(k,[item]);
    }
  }
  insertPoint(item,lat,lon){
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    this.insert(item,{west:lon,east:lon,south:lat,north:lat});
  }
  query(extent){
    if(!extent)return[];
    const r=this.range(extent),seen=new Set(),out=[];
    for(const item of this.overflow){seen.add(item);out.push(item)}
    for(let iy=r.y1;iy<=r.y2;iy++)for(let ix=r.x1;ix<=r.x2;ix++){
      const bucket=this.buckets.get(this.key(ix,iy));if(!bucket)continue;
      for(const item of bucket)if(!seen.has(item)){seen.add(item);out.push(item)}
    }
    return out;
  }
}
const spatialRuntime={
  dirty:true,refs:new Map(),normalizedPois:[],poiByRaw:new WeakMap(),
  poiIndex:new SpatialHashIndex(.012),osmIndex:new SpatialHashIndex(.012),cadastreIndex:new SpatialHashIndex(.006),
  rebuilds:0,lastBuildMs:0,lastQueryCandidates:0,lastQueryResults:0
};
const descriptionRuntime={
  revision:0,cache:new Map(),selectionToken:0,hits:0,misses:0,maxEntries:320,lastKey:""
};
const relationRuntime={cache:new Map(),timer:0};
const guidedTourRuntime={revision:-1,count:-1,tours:[],byId:new Map()};
function invalidateDescriptionCache(){
  descriptionRuntime.revision++;
  descriptionRuntime.cache.clear();
  descriptionRuntime.lastKey="";
  relationRuntime.cache.clear();
  guidedTourRuntime.revision=-1;
}
function markSpatialIndexesDirty(){spatialRuntime.dirty=true;invalidateDescriptionCache()}
function boundsFromCoords(coords){
  if(!Array.isArray(coords)||!coords.length)return null;
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const pair of coords){
    const lon=Number(pair?.[0]),lat=Number(pair?.[1]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);
  }
  return Number.isFinite(west)?{west,east,south,north}:null;
}
function featureBounds(feature){
  const b=feature?.bbox;
  if(b&&[b.west,b.east,b.south,b.north].every(Number.isFinite))return b;
  return boundsFromCoords(feature?.coords);
}
function normalizedPoiCategory(sourceType,raw){
  if(sourceType==="bss")return "bss";
  if(sourceType==="cavity")return "cavity";
  if(sourceType==="heritage")return "heritage";
  if(sourceType==="observation"||sourceType==="lore")return "memory";
  if(sourceType==="cartofriches")return "industrial";
  if(sourceType==="house")return "home";
  if(sourceType==="location")return "location";
  return "natural";
}
function makeNormalizedPoi(sourceType,raw,overrides={}){
  const lat=Number(overrides.lat??raw?.lat),lon=Number(overrides.lon??raw?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  const id=String(overrides.id??raw?.id??raw?.indice??`${sourceType}:${lat.toFixed(6)}:${lon.toFixed(6)}`);
  const title=String(overrides.title??raw?.name??raw?.designation??raw?.nomCavite??overrides.kind??sourceType);
  return {
    uid:`${sourceType}:${id}`,id,sourceType,
    category:overrides.category||normalizedPoiCategory(sourceType,raw),
    subtype:String(overrides.subtype??raw?.category??raw?.type??raw?.nature??""),
    title,kind:String(overrides.kind??raw?.kind??raw?.type??sourceType),
    description:String(overrides.description??raw?.description??raw?.note??""),
    source:String(overrides.source??raw?.source??""),
    lat,lon,priority:Number(overrides.priority??0),raw,
    tags:overrides.tags||raw?.tags||null
  };
}
function poiFeatureInfo(poi,extra={}){
  return {
    id:poi.id,name:poi.title,kind:poi.kind,source:poi.source,lat:poi.lat,lon:poi.lon,
    poi:true,poiId:poi.uid,poiCategory:poi.category,poiSourceType:poi.sourceType,
    normalizedPoi:poi,record:poi.raw,...extra
  };
}
function spatialSourceChanged(name,value){
  const previous=spatialRuntime.refs.get(name);
  const length=Array.isArray(value)?value.length:-1;
  if(!previous||previous.ref!==value||previous.length!==length){
    spatialRuntime.refs.set(name,{ref:value,length});return true;
  }
  return false;
}
function ensureSpatialIndexes(){
  let changed=spatialRuntime.dirty;
  const sources={
    osm:state.osm,cadastreBuildings:state.cadastreBuildings,cadastreParcels:state.cadastreParcels,
    bss:state.bss,cavities:state.cavities,observations:state.observations,heritage:state.heritageItems,
    lore:state.loreItems,cartofriches:state.cartofriches,userLocation:state.userLocation
  };
  for(const [name,value] of Object.entries(sources))if(spatialSourceChanged(name,value))changed=true;
  const houseStamp=`${CONFIG.house.lat}:${CONFIG.house.lon}`;
  if(spatialRuntime.refs.get("houseStamp")!==houseStamp){spatialRuntime.refs.set("houseStamp",houseStamp);changed=true}
  if(!changed)return;
  const started=performance.now();
  spatialRuntime.poiIndex.clear();spatialRuntime.osmIndex.clear();spatialRuntime.cadastreIndex.clear();
  spatialRuntime.normalizedPois=[];spatialRuntime.poiByRaw=new WeakMap();
  const seen=new Set();
  const addPoi=(sourceType,raw,overrides={})=>{
    const poi=makeNormalizedPoi(sourceType,raw,overrides);if(!poi)return;
    const dedupe=`${poi.sourceType}|${poi.id}|${poi.lat.toFixed(6)}|${poi.lon.toFixed(6)}`;
    if(seen.has(dedupe))return;seen.add(dedupe);
    spatialRuntime.normalizedPois.push(poi);spatialRuntime.poiIndex.insertPoint(poi,poi.lat,poi.lon);
    if(raw&&typeof raw==="object")spatialRuntime.poiByRaw.set(raw,poi);
  };
  for(const b of state.bss||[])addPoi("bss",b,{kind:b.piezo?"station piézométrique":"forage ou ouvrage BSS",priority:b.piezo?19:17});
  for(const c of state.cavities||[])addPoi("cavity",c,{kind:cavityType(c),title:cavityName(c),priority:18});
  for(const o of state.observations||[])addPoi("observation",o,{kind:o.mode==="sight"?"ligne de visée observée":o.mode==="zone"?"zone d’observation approximative":"observation ponctuelle",title:o.name||"Observation locale",priority:19});
  for(const h of state.heritageItems||[])addPoi("heritage",h,{kind:h.category||"patrimoine",title:h.name||"Lieu patrimonial",priority:21});
  for(const l of state.loreItems||[])addPoi("lore",l,{kind:l.category||"mémoire locale",title:l.name||"Repère local",priority:20});
  for(const f of state.cartofriches||[])addPoi("cartofriches",f,{kind:f.type||"site Cartofriches",title:f.name||"Site recensé",priority:22});
  if(OFFLINE_TEST&&!state.cartofriches?.length&&!state.loreItems?.length&&!state.localCavities?.length){
    for(const d of OFFLINE_DEMO_POINTS)addPoi("demo",d,{kind:d.kind,title:d.name,priority:21});
  }
  addPoi("house",CONFIG.house,{id:"house",title:"42 rue de la Falaise",kind:"maison",source:"Repère privé de l’Atlas",priority:24});
  if(state.userLocation)addPoi("location",state.userLocation,{id:"user-location",title:"Ma position",kind:"position actuelle",source:"Géolocalisation ponctuelle du navigateur",priority:50});
  for(const f of state.osm||[]){
    const bounds=featureBounds(f);if(bounds)spatialRuntime.osmIndex.insert(f,bounds);
    const t=f.tags||{};
    if(["spring","sinkhole","cave_entrance"].includes(t.natural)&&Array.isArray(f.coords)&&f.coords.length){
      const c=f.coords[Math.floor(f.coords.length/2)];
      addPoi("osm-natural",f,{id:f.id,title:t.name||t.natural,kind:`point naturel OSM · ${t.natural}`,lat:c?.[1],lon:c?.[0],source:"OpenStreetMap",priority:12,tags:t});
    }
  }
  for(const f of state.cadastreBuildings||[]){const bounds=featureBounds(f);if(bounds)spatialRuntime.cadastreIndex.insert({kind:"building",feature:f},bounds)}
  for(const f of state.cadastreParcels||[]){const bounds=featureBounds(f);if(bounds)spatialRuntime.cadastreIndex.insert({kind:"parcel",feature:f},bounds)}
  spatialRuntime.dirty=false;spatialRuntime.rebuilds++;spatialRuntime.lastBuildMs=performance.now()-started;
}
function queryNormalizedPois(extent,sourceTypes=null){
  ensureSpatialIndexes();
  const candidates=spatialRuntime.poiIndex.query(extent);
  spatialRuntime.lastQueryCandidates+=candidates.length;
  const allowed=sourceTypes==null?null:new Set(Array.isArray(sourceTypes)?sourceTypes:[sourceTypes]);
  const results=candidates.filter(p=>inExtent(p.lat,p.lon,extent)&&(!allowed||allowed.has(p.sourceType)));
  spatialRuntime.lastQueryResults+=results.length;
  return results;
}

function extentAroundPoint(point,radiusMeters){
  const latDelta=radiusMeters/111320;
  const lonScale=Math.max(.08,Math.cos(rad(point.lat)));
  const lonDelta=radiusMeters/(111320*lonScale);
  return {west:point.lon-lonDelta,east:point.lon+lonDelta,south:point.lat-latDelta,north:point.lat+latDelta};
}
function normalizedPoiByUid(uid){
  ensureSpatialIndexes();
  return spatialRuntime.normalizedPois.find(p=>p.uid===uid)||null;
}
function rawPoiText(poi,keys){
  for(const key of keys){
    const value=poi?.raw?.[key];
    if(value!=null&&String(value).trim())return String(value).trim();
  }
  return "";
}
function poiRelationEntries(poi,limit=7){
  if(!poi)return[];
  const cacheKey=`${descriptionRuntime.revision}|${poi.uid}|${limit}`;
  const cached=relationRuntime.cache.get(cacheKey);if(cached)return cached;
  const candidates=queryNormalizedPois(extentAroundPoint(poi,2600)).filter(p=>p.uid!==poi.uid&&p.sourceType!=="location");
  const commune=rawPoiText(poi,["commune","comm_nom","city"]),period=rawPoiText(poi,["period","periode","siecle"]),place=rawPoiText(poi,["place","lieu_dit","lieudit"]);
  const ranked=[];
  for(const other of candidates){
    const distance=distanceMeters(poi,other);if(distance>2500)continue;
    const reasons=[];let score=0,kind="géographique";
    if(distance<=180){score+=30;reasons.push("proximité immédiate")}
    else if(distance<=500){score+=22;reasons.push("même voisinage")}
    else if(distance<=1200){score+=12;reasons.push("secteur proche")}
    else score+=5;
    if(other.category===poi.category){score+=24;reasons.push(`même famille · ${poiCategoryLabel(poi.category)}`);kind="typologique"}
    if(other.sourceType===poi.sourceType&&poi.sourceType!=="osm-natural"){score+=15;reasons.push("même catalogue documentaire");kind="documentaire"}
    const otherCommune=rawPoiText(other,["commune","comm_nom","city"]);
    if(commune&&otherCommune&&commune.toLowerCase()===otherCommune.toLowerCase()){score+=10;reasons.push(`même commune · ${commune}`)}
    const otherPeriod=rawPoiText(other,["period","periode","siecle"]);
    if(period&&otherPeriod&&period.toLowerCase()===otherPeriod.toLowerCase()){score+=13;reasons.push(`même période · ${period}`);kind="documentaire"}
    const otherPlace=rawPoiText(other,["place","lieu_dit","lieudit"]);
    if(place&&otherPlace&&place.toLowerCase()===otherPlace.toLowerCase()){score+=18;reasons.push(`même lieu-dit · ${place}`);kind="documentaire"}
    if(score<14)continue;
    ranked.push({poi:other,distance,score,kind,reasons:[...new Set(reasons)].slice(0,3)});
  }
  ranked.sort((a,b)=>b.score-a.score||a.distance-b.distance||b.poi.priority-a.poi.priority);
  const result=[],perCategory=new Map();
  for(const entry of ranked){
    const key=entry.poi.category,count=perCategory.get(key)||0;
    if(count>=3)continue;
    result.push(entry);perCategory.set(key,count+1);
    if(result.length>=limit)break;
  }
  relationRuntime.cache.set(cacheKey,result);return result;
}
function primaryNormalizedPoiForCell(cell,x,y){
  const f=cell?.feature;if(!f)return null;
  if(f.normalizedPoi)return f.normalizedPoi;
  if(Array.isArray(f.normalizedPois)&&f.normalizedPois.length)return f.normalizedPois[0];
  if(f.record&&typeof f.record==="object"){
    const mapped=spatialRuntime.poiByRaw.get(f.record);if(mapped)return mapped;
  }
  if(!state.lastGrid)return null;
  const coord=gridToCoord(x,y,state.lastGrid.extent);
  const cellRadius=Math.max(35,(currentZoom().widthKm*1000/CONFIG.gridW+currentZoom().heightKm*1000/CONFIG.gridH)*.72);
  return queryNormalizedPois(extentAroundPoint(coord,cellRadius)).sort((a,b)=>distanceMeters(coord,a)-distanceMeters(coord,b)||b.priority-a.priority)[0]||null;
}
function relationsNarrative(cell,x,y){
  const source=primaryNormalizedPoiForCell(cell,x,y);if(!source)return"";
  const entries=poiRelationEntries(source);if(!entries.length)return"";
  return `<section class="cell-section cell-section-relations"><h3>Lieux en relation</h3><div class="relation-list">${entries.map(entry=>{
    const p=entry.poi,distance=entry.distance<50?"moins de 50 m":`${Math.round(entry.distance/10)*10} m`;
    return `<div class="relation-item"><button class="relation-frame" type="button" data-relation-from="${escAttr(source.uid)}" data-relation-to="${escAttr(p.uid)}" data-relation-label="${escAttr(entry.reasons[0]||entry.kind)}"><strong>${esc(p.title)}</strong><span class="relation-reason"><span class="relation-kind">${esc(entry.kind)}</span>${esc(entry.reasons.join(" · "))} · ${distance}</span></button><button class="relation-open" type="button" title="Ouvrir la fiche de ${escAttr(p.title)}" aria-label="Ouvrir la fiche de ${escAttr(p.title)}" data-poi-focus="${escAttr(p.uid)}">→</button></div>`;
  }).join("")}</div><p class="relation-note">Ces rapprochements signalent une proximité, une similitude ou une source commune. Ils ne prouvent pas une connexion physique ou historique.</p></section>`;
}
function aroundMeEntries(){
  const loc=state.userLocation;if(!loc)return[];
  const radius=Number(state.aroundRadius)||500;
  return queryNormalizedPois(extentAroundPoint(loc,radius)).filter(p=>p.sourceType!=="location"&&distanceMeters(loc,p)<=radius).map(p=>({poi:p,distance:distanceMeters(loc,p),bearing:bearingDegrees(loc,p)})).sort((a,b)=>a.distance-b.distance||b.poi.priority-a.poi.priority);
}
function updateAroundMe(){
  if(!els.aroundSummary||!els.aroundList)return;
  const loc=state.userLocation;
  if(!loc){els.aroundSummary.textContent="Localise-toi pour dresser l’inventaire des lieux proches.";els.aroundList.innerHTML="";return}
  const entries=aroundMeEntries(),radius=Number(state.aroundRadius)||500;
  const counts=new Map();for(const e of entries)counts.set(e.poi.category,(counts.get(e.poi.category)||0)+1);
  const summary=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([category,n])=>`${n} ${poiCategoryLabel(category).toLowerCase()}`).join(" · ");
  const accuracyNote=Number(loc.accuracy)>radius*.6?`<br><span style="color:var(--warn)">Précision GPS ± ${Math.round(loc.accuracy)} m : les distances restent indicatives.</span>`:"";
  els.aroundSummary.innerHTML=entries.length?`<strong>${entries.length} repère${entries.length>1?"s":""}</strong> dans un rayon de ${radius>=1000?`${radius/1000} km`:`${radius} m`}<br>${esc(summary)}${accuracyNote}`:`Aucun point d’intérêt indexé dans un rayon de ${radius>=1000?`${radius/1000} km`:`${radius} m`}.${accuracyNote}`;
  const displayed=[],perCategory=new Map();
  for(const entry of entries){
    const key=entry.poi.category,count=perCategory.get(key)||0;
    if(count>=5)continue;
    displayed.push(entry);perCategory.set(key,count+1);
    if(displayed.length>=14)break;
  }
  els.aroundList.innerHTML=displayed.map(({poi,distance,bearing})=>`<button class="poi-nav-button" type="button" data-poi-focus="${escAttr(poi.uid)}"><span class="poi-nav-head"><span class="poi-nav-title">${esc(poi.title)}</span><span class="poi-nav-distance">${distance<50?"< 50 m":`${Math.round(distance/10)*10} m`}</span></span><span class="poi-nav-meta">${esc(poiCategoryLabel(poi.category))} · ${esc(cardinalDirection(bearing))}</span></button>`).join("");
}


const ENCOUNTER_PREF_KEY="atlas-karst-encounters-enabled-v1";
const ENCOUNTER_COLLECTION_KEY="atlas-karst-encounters-v1";
const LOCAL_ENCOUNTERS=[
  {id:"ecureuil-roux",family:"faune",title:"Écureuil roux",scientificName:"Sciurus vulgaris",habitats:["forest","hedge","park","general"],rarity:1.1,sprite:String.raw`  /\\_/\\
 ( o.o )  ))
  > ^ <==//`,intro:"Une queue rousse disparaît derrière un tronc, puis deux yeux noirs te surveillent depuis une branche.",summary:"Petit rongeur arboricole des bois, parcs et haies arborées.",facts:["Il constitue des réserves dispersées de graines et de fruits.","Les graines oubliées peuvent contribuer à la régénération des arbres.","Sa présence ludique ici indique seulement un milieu compatible, pas une observation."],source:"Fiche pédagogique générale · INPN / OFB",questions:[
    {q:"Quel indice est le plus caractéristique de l’écureuil roux adulte ?",a:["Une longue queue touffue","Des pattes palmées","Un bec court","Une carapace striée"],ok:0,e:"Sa longue queue touffue l’aide notamment à l’équilibre et à la communication."},
    {q:"Pourquoi cache-t-il des graines en plusieurs endroits ?",a:["Pour constituer des réserves","Pour marquer une frontière","Pour attirer les oiseaux","Pour construire son nid"],ok:0,e:"Il disperse ses réserves afin de réduire le risque de tout perdre au même endroit."},
    {q:"Quel rôle peut-il jouer involontairement dans la forêt ?",a:["Disperser certaines graines","Creuser les rivières","Polliniser toutes les fleurs","Éroder le calcaire"],ok:0,e:"Les graines non retrouvées peuvent germer et participer au renouvellement forestier."}]},
  {id:"herisson-europe",family:"faune",title:"Hérisson d’Europe",scientificName:"Erinaceus europaeus",habitats:["hedge","meadow","garden","village","general"],rarity:1,sprite:String.raw`   .-""-.
  / .--. \\
 /_/    \\_\\
\\  \\__/  /`,intro:"Un froissement sec traverse la haie. Une petite boule d’épines hésite entre la fuite et l’enquête.",summary:"Mammifère surtout nocturne, lié aux haies, jardins et mosaïques de prairies.",facts:["Il se nourrit surtout de nombreux invertébrés et autres petites proies.","Il hiverne lorsque les ressources deviennent rares.","Les clôtures entièrement étanches fragmentent ses déplacements."],source:"Fiche pédagogique générale · INPN / OFB",questions:[
    {q:"À quel moment le hérisson est-il généralement le plus actif ?",a:["La nuit","À midi uniquement","Pendant les fortes chaleurs","Sous l’eau"],ok:0,e:"Le hérisson mène surtout une activité crépusculaire et nocturne."},
    {q:"Son alimentation comprend surtout…",a:["Des invertébrés et petites proies","Des feuilles de chêne","Uniquement des fruits","Du bois mort"],ok:0,e:"Vers, insectes, limaces et autres petites proies constituent une part importante de son régime."},
    {q:"Pourquoi de petits passages sous les clôtures peuvent-ils l’aider ?",a:["Ils relient ses zones de déplacement","Ils réchauffent son nid","Ils attirent la pluie","Ils remplacent sa nourriture"],ok:0,e:"Le hérisson parcourt plusieurs jardins et haies ; les clôtures hermétiques peuvent le bloquer."}]},
  {id:"salamandre-tachetee",family:"faune",title:"Salamandre tachetée",scientificName:"Salamandra salamandra",habitats:["forest","water","wet","cavity"],rarity:.82,sprite:String.raw`  __     __
 /  \\___/  \\
|  o  _  o  |
 \\__\/ \\__/`,intro:"Sur la litière humide, un éclair jaune et noir semble avoir été peint directement sur la nuit.",summary:"Amphibien forestier recherchant des secteurs frais et humides.",facts:["Sa livrée jaune et noire signale des sécrétions cutanées défensives.","Les adultes sont terrestres, tandis que les larves se développent dans l’eau.","Il ne faut ni manipuler ni déplacer un amphibien rencontré."],source:"Fiche pédagogique générale · INPN / OFB",questions:[
    {q:"Que suggère sa coloration jaune et noire ?",a:["Un signal d’avertissement","Un camouflage dans le sable","Une adaptation au vol","Une vie exclusivement aquatique"],ok:0,e:"Cette coloration contrastée avertit les prédateurs de ses défenses cutanées."},
    {q:"Quel milieu lui est généralement favorable ?",a:["Un sous-bois frais et humide","Une dalle brûlante","Une plaine sans abri","Une eau salée profonde"],ok:0,e:"Elle dépend de refuges frais et humides, souvent en milieu forestier."},
    {q:"Où se développent ses larves ?",a:["Dans l’eau","Dans les glands","Sous les tuiles sèches","Dans les fleurs"],ok:0,e:"Les larves sont déposées dans des eaux adaptées, alors que les adultes vivent surtout à terre."}]},
  {id:"martin-pecheur",family:"faune",title:"Martin-pêcheur d’Europe",scientificName:"Alcedo atthis",habitats:["water","river"],rarity:.72,sprite:String.raw`   __
 >(o )___
  ( ._> /
   \\___/`,intro:"Une étincelle bleue fend le cours d’eau à ras de la surface et se pose plus loin sur une branche basse.",summary:"Petit oiseau vivement coloré associé aux eaux poissonneuses et aux berges adaptées.",facts:["Il chasse de petites proies aquatiques depuis un perchoir.","Son nid est installé dans un terrier creusé dans une berge meuble.","Le voir dans ce jeu ne constitue pas un signalement réel de l’espèce."],source:"Fiche pédagogique générale · INPN / OFB",questions:[
    {q:"Quelle est sa proie la plus emblématique ?",a:["De petits poissons","Des glands","Des feuilles","Des lézards marins"],ok:0,e:"Il plonge depuis un perchoir pour capturer de petites proies aquatiques, notamment des poissons."},
    {q:"Où installe-t-il généralement son nid ?",a:["Dans un terrier de berge","Au sommet d’un clocher","Dans une ruche","Sous une pierre sèche"],ok:0,e:"Le couple creuse un tunnel dans une berge meuble ou un talus adapté."},
    {q:"Quel indice trahit souvent son passage avant même de le voir ?",a:["Un cri aigu et un vol rapide au ras de l’eau","Un tambourinement sur le bois","Un chant grave nocturne","Une trace de sabot"],ok:0,e:"Son cri perçant et son vol direct au-dessus de l’eau sont souvent les premiers indices."}]},
  {id:"lucane-cerf-volant",family:"faune",title:"Lucane cerf-volant",scientificName:"Lucanus cervus",habitats:["forest","hedge","park"],rarity:.65,sprite:String.raw`  \\  /
 --\\/--
 ( o  o )
  \\____/`,intro:"Une silhouette cuirassée grimpe lentement le long d’un vieux tronc, mandibules dressées comme des bois miniatures.",summary:"Grand coléoptère lié aux vieux arbres et au bois mort enfoui.",facts:["Les mandibules très développées concernent surtout les mâles.","La larve se développe plusieurs années dans du bois mort en décomposition.","Conserver du vieux bois et des souches favorise une partie de la biodiversité forestière."],source:"Fiche pédagogique générale · INPN / OFB",questions:[
    {q:"À quoi servent surtout les grandes mandibules du mâle ?",a:["Aux affrontements entre mâles","À couper les arbres","À filtrer l’eau","À creuser le calcaire"],ok:0,e:"Elles servent notamment lors de confrontations et de parades, pas à broyer du bois vivant."},
    {q:"Où se développe la larve ?",a:["Dans du bois mort en décomposition","Dans une rivière rapide","Sur des feuilles fraîches","Dans un nid d’oiseau"],ok:0,e:"La phase larvaire, longue, dépend du bois mort ou très décomposé."},
    {q:"Quel geste favorise ce type d’espèce ?",a:["Conserver une part de bois mort","Nettoyer tout le sous-bois","Bétonner les souches","Éclairer les arbres toute la nuit"],ok:0,e:"Le bois mort est un habitat et une ressource essentiels pour de nombreuses espèces."}]},
  {id:"chene-pedoncule",family:"flore",title:"Chêne pédonculé",scientificName:"Quercus robur",habitats:["forest","hedge","meadow","park","general"],rarity:1.15,sprite:String.raw`    /\\
  _/  \\_
 /_ /\\ _\\
    ||`,intro:"Un chêne ancien déploie sa couronne comme une petite carte du ciel végétal.",summary:"Grand arbre feuillu commun des haies, bois et paysages agricoles.",facts:["Ses fruits sont les glands, portés par un pédoncule.","Un vieux chêne peut abriter une très grande diversité d’organismes.","Les arbres isolés et les haies servent aussi de continuités écologiques."],source:"Fiche pédagogique générale · INPN / ONF",questions:[
    {q:"Comment s’appelle le fruit du chêne ?",a:["Le gland","La samare","La baie","La bogue"],ok:0,e:"Le gland est un fruit sec contenant une graine."},
    {q:"Pourquoi un vieux chêne est-il précieux pour la biodiversité ?",a:["Il offre cavités, écorce et bois mort","Il repousse toute autre espèce","Il assèche toujours le sol","Il ne produit jamais d’ombre"],ok:0,e:"Ses cavités, fissures, feuilles, racines et bois mort créent de nombreux microhabitats."},
    {q:"Quel élément donne son nom au chêne pédonculé ?",a:["Le pédoncule portant ses glands","La forme de ses racines","La couleur de son bois","La hauteur de son tronc"],ok:0,e:"Les glands sont portés par un pédoncule relativement long."}]},
  {id:"prunellier",family:"flore",title:"Prunellier",scientificName:"Prunus spinosa",habitats:["hedge","meadow","scrub","general"],rarity:1,sprite:String.raw`  * * *
 * /|\\ *
  / | \\
    |`,intro:"La haie s’allume de petites étoiles blanches, avant même que les feuilles aient fini de sortir.",summary:"Arbuste épineux des haies et lisières, producteur de prunelles bleu-noir.",facts:["Il fleurit souvent avant l’apparition complète de ses feuilles.","Ses fruits, les prunelles, sont très astringents à maturité ordinaire.","Les haies fournissent abri, nourriture et corridors à de nombreuses espèces."],source:"Fiche pédagogique générale · INPN / Tela Botanica",questions:[
    {q:"Comment s’appellent ses fruits ?",a:["Les prunelles","Les samares","Les faînes","Les cônes"],ok:0,e:"Les prunelles sont de petits fruits bleu-noir très astringents."},
    {q:"Quand ses fleurs blanches apparaissent-elles souvent ?",a:["Avant ou au début des feuilles","Uniquement en plein hiver","Après la chute des fruits","Sous l’eau"],ok:0,e:"La floraison blanche peut précéder nettement le feuillage."},
    {q:"Quel rôle joue une haie de prunelliers ?",a:["Abri, nourriture et corridor","Barrage étanche à toute faune","Source de sel","Substitut à une rivière"],ok:0,e:"Une haie diversifiée fournit des ressources et relie différents habitats."}]},
  {id:"fougere-aigle",family:"flore",title:"Fougère aigle",scientificName:"Pteridium aquilinum",habitats:["forest","clearing","scrub"],rarity:.9,sprite:String.raw`   _/\\_
 _/ /\\ \\_
/__/  \\__\\
    ||`,intro:"Une grande fronde se déroule au bord du chemin, verte spirale sortie du sol sombre.",summary:"Grande fougère fréquente dans les landes, bois clairs et lisières.",facts:["Comme les autres fougères, elle ne produit ni fleur ni graine.","Elle se reproduit par spores et se développe aussi grâce à des rhizomes.","Elle peut former des peuplements denses après une ouverture du milieu."],source:"Fiche pédagogique générale · INPN / Tela Botanica",questions:[
    {q:"Une fougère produit-elle des fleurs ?",a:["Non, elle produit des spores","Oui, toujours jaunes","Seulement sous terre","Uniquement la nuit"],ok:0,e:"Les fougères appartiennent à des plantes vasculaires sans fleurs ni graines."},
    {q:"Comment appelle-t-on sa grande feuille ?",a:["Une fronde","Une écaille","Une aiguille","Un pétale"],ok:0,e:"Le terme fronde désigne la feuille des fougères."},
    {q:"Quelle structure souterraine l’aide à s’étendre ?",a:["Un rhizome","Une coquille","Un bulbe aquatique","Une racine aérienne unique"],ok:0,e:"Son réseau de rhizomes peut produire de nombreuses frondes."}]},
  {id:"calcaire-karst",family:"geologie",title:"Calcaire karstifié",scientificName:"Roche carbonatée",habitats:["limestone","cavity","quarry","general"],rarity:.85,sprite:String.raw`  ______
 / _  _ \\
|_/ \\/ \\_|
  \\____/`,intro:"La pierre semble compacte, mais l’eau y a écrit un réseau de fissures, de vides et de passages possibles.",summary:"Roche carbonatée pouvant être lentement dissoute par une eau légèrement acide.",facts:["Le dioxyde de carbone dissous rend l’eau légèrement acide et favorise la dissolution du carbonate.","Un relief karstique peut associer pertes, résurgences, fissures et cavités.","La carte souterraine de l’Atlas reste interprétative sans levé géologique local détaillé."],source:"Fiche pédagogique générale · BRGM",questions:[
    {q:"Quel processus façonne progressivement un karst calcaire ?",a:["La dissolution par une eau légèrement acide","La fusion par le soleil","La magnétisation","La croissance de racines métalliques"],ok:0,e:"L’eau chargée en dioxyde de carbone peut dissoudre lentement les carbonates."},
    {q:"Qu’est-ce qu’une résurgence ?",a:["Un retour de l’eau souterraine à la surface","Une falaise artificielle","Un arbre fossile","Un type de nuage"],ok:0,e:"Une résurgence correspond à la réapparition en surface d’un écoulement souterrain."},
    {q:"Un forage proche prouve-t-il l’existence d’une galerie ?",a:["Non, il renseigne un point vertical","Oui, toujours","Seulement en été","Seulement si le forage est sec"],ok:0,e:"Un forage documente la succession rencontrée à son emplacement, pas un réseau de galeries alentour."}]},
  {id:"ammonite",family:"geologie",title:"Ammonite",scientificName:"Ammonoidea",habitats:["limestone","quarry","rock"],rarity:.55,sprite:String.raw`   .-""-.
  / .--. \\
 | ( () ) |
  \\ '--' /`,intro:"Dans une cassure claire apparaît une spirale régulière : la mer ancienne a laissé sa signature dans la pierre.",summary:"Fossile d’un groupe éteint de céphalopodes marins à coquille souvent spiralée.",facts:["Les ammonites vivaient en mer et sont aujourd’hui éteintes.","Leur coquille était divisée en loges.","Un fossile doit être observé dans son contexte ; la collecte peut être réglementée selon le lieu."],source:"Fiche pédagogique générale · Muséum national d’Histoire naturelle",questions:[
    {q:"Les ammonites étaient…",a:["Des céphalopodes marins","Des plantes terrestres","Des mammifères volants","Des minéraux"],ok:0,e:"Elles appartenaient à un groupe de mollusques céphalopodes aujourd’hui éteint."},
    {q:"Que suggère une ammonite dans une roche ?",a:["Un dépôt formé en milieu marin","Une ancienne forêt tropicale certaine","Une carrière moderne","Une météorite"],ok:0,e:"Sa présence indique un contexte marin au moment du dépôt des sédiments."},
    {q:"Comment était organisée sa coquille ?",a:["En loges successives","En une plaque pleine","En fibres végétales","Sans structure interne"],ok:0,e:"Des cloisons divisaient la coquille en chambres, l’animal occupant la dernière."}]},
  {id:"lavoir",family:"patrimoine",title:"Lavoir",scientificName:"Patrimoine hydraulique",habitats:["water","village","heritage"],rarity:.8,sprite:String.raw`  _______
 /______/|
 | ~~~~ | |
 |______|/`,intro:"Sous un petit toit, l’eau immobile reflète les pierres usées par des gestes répétés pendant des générations.",summary:"Aménagement collectif destiné au lavage du linge, souvent alimenté par une source ou un cours d’eau.",facts:["Le lavoir organisait un usage collectif de l’eau avant la généralisation des machines domestiques.","Il constituait aussi un lieu important de sociabilité.","Une rencontre ludique n’affirme pas qu’un lavoir existe précisément sous le marqueur GPS."],source:"Fiche pédagogique générale · Inventaire du patrimoine",questions:[
    {q:"À quoi servait principalement un lavoir ?",a:["À laver le linge","À fondre le minerai","À stocker le grain","À mesurer la profondeur des grottes"],ok:0,e:"Il offrait un bassin et un accès à l’eau adaptés au lavage collectif du linge."},
    {q:"Pourquoi est-il souvent proche d’une source ou d’un ruisseau ?",a:["Pour disposer d’une eau renouvelée","Pour attirer les moulins à vent","Pour sécher les pierres","Pour éviter toute humidité"],ok:0,e:"Son fonctionnement dépendait d’une alimentation en eau suffisante et aussi régulière que possible."},
    {q:"Au-delà de son usage pratique, le lavoir était aussi…",a:["Un lieu de sociabilité","Une fortification","Un observatoire astronomique","Une carrière"],ok:0,e:"Le travail partagé en faisait un lieu d’échanges sociaux important."}]},
  {id:"moulin-eau",family:"patrimoine",title:"Moulin à eau",scientificName:"Patrimoine hydraulique",habitats:["water","river","heritage"],rarity:.72,sprite:String.raw`   ____
 _/____\\_
|  O  O  |
|___()___|`,intro:"Un grondement régulier semble remonter du bief : l’eau devient mouvement, puis travail.",summary:"Installation transformant l’énergie d’un courant ou d’une chute d’eau en énergie mécanique.",facts:["La roue transmet le mouvement à un mécanisme.","Les moulins pouvaient moudre le grain mais aussi actionner d’autres ateliers.","Biefs, chaussées et canaux peuvent laisser des traces durables dans le paysage."],source:"Fiche pédagogique générale · Inventaire du patrimoine",questions:[
    {q:"Quelle énergie utilise un moulin à eau ?",a:["L’énergie du courant ou d’une chute","La lumière des étoiles","Le vent uniquement","La chaleur du calcaire"],ok:0,e:"Le mouvement de l’eau entraîne une roue ou une turbine, puis un mécanisme."},
    {q:"Que désigne un bief ?",a:["Un canal conduisant l’eau au moulin","Une pierre de meule","Un grenier","Une cloche"],ok:0,e:"Le bief amène ou régule l’eau destinée au mécanisme hydraulique."},
    {q:"Tous les moulins à eau servaient-ils uniquement à faire de la farine ?",a:["Non, ils pouvaient actionner divers ateliers","Oui, sans exception","Seulement après 1950","Uniquement dans les villes"],ok:0,e:"L’énergie hydraulique a servi à de nombreuses activités : meunerie, papier, forge, scierie, etc."}]},
  {id:"chauve-souris",family:"faune",title:"Pipistrelle commune",scientificName:"Pipistrellus pipistrellus",habitats:["village","forest","water","cavity","general"],rarity:.75,sprite:String.raw` \\  /\\  /
  \\/  \\/
  ( oo )
   \\__/`,intro:"Au crépuscule, une petite silhouette brise sa trajectoire en angles vifs, chasseuse d’insectes dans l’air sombre.",summary:"Petite chauve-souris insectivore fréquentant de nombreux paysages, y compris les zones bâties.",facts:["Elle utilise l’écholocalisation pour se repérer et chasser.","Elle consomme de nombreux insectes volants.","Les chauves-souris sont protégées ; leurs gîtes ne doivent pas être dérangés."],source:"Fiche pédagogique générale · INPN / OFB",questions:[
    {q:"Quel système utilise-t-elle pour se repérer dans l’obscurité ?",a:["L’écholocalisation","Une lumière produite par ses ailes","Le magnétisme des arbres uniquement","Des antennes"],ok:0,e:"Elle émet des ultrasons et analyse les échos renvoyés par son environnement."},
    {q:"De quoi se nourrit principalement une pipistrelle ?",a:["D’insectes volants","De glands","De poissons","De calcaire"],ok:0,e:"Elle capture en vol de nombreux petits insectes."},
    {q:"Que faire si un gîte de chauves-souris est découvert ?",a:["Éviter le dérangement et demander conseil","Le condamner immédiatement","Les manipuler","Éclairer le gîte toute la nuit"],ok:0,e:"Les chauves-souris et leurs gîtes sont protégés ; mieux vaut éviter toute intervention improvisée."}]}
];
const ENCOUNTER_BY_ID=new Map(LOCAL_ENCOUNTERS.map(e=>[e.id,e]));
const encounterRuntime={screen:"closed",active:null,answerLocked:false,returnScreen:"codex"};

function loadEncounterCollection(){
  try{const raw=JSON.parse(localStorage.getItem(ENCOUNTER_COLLECTION_KEY)||"{}");state.encounterCollection=raw&&typeof raw==="object"?raw:{}}catch{state.encounterCollection={}}
  try{state.encounterEnabled=localStorage.getItem(ENCOUNTER_PREF_KEY)!=="off"}catch{state.encounterEnabled=true}
}
function saveEncounterCollection(){
  try{localStorage.setItem(ENCOUNTER_COLLECTION_KEY,JSON.stringify(state.encounterCollection||{}));localStorage.setItem(ENCOUNTER_PREF_KEY,state.encounterEnabled?"on":"off")}catch{}
}
function encounterRecord(id){return state.encounterCollection?.[id]||null}
function encounterStatusRank(status){return status==="deepened"?3:status==="identified"?2:status==="seen"?1:0}
function encounterCollectionStats(){
  const records=Object.values(state.encounterCollection||{}),seen=records.filter(r=>encounterStatusRank(r.status)>=1).length,identified=records.filter(r=>encounterStatusRank(r.status)>=2).length,deepened=records.filter(r=>encounterStatusRank(r.status)>=3).length;
  return {seen,identified,deepened,total:LOCAL_ENCOUNTERS.length};
}
function encounterFamilyLabel(f){return({faune:"Faune",flore:"Flore",geologie:"Géologie",patrimoine:"Patrimoine"})[f]||"Curiosité"}
function encounterHabitatContext(loc=state.userLocation){
  const tags=new Set(["general"]),notes=[];if(!loc)return{tags,notes};
  if(state.lastGrid&&inExtent(loc.lat,loc.lon,state.lastGrid.extent)){
    const p=coordToGrid(loc.lat,loc.lon,state.lastGrid.extent),cell=state.lastGrid.grid[p.y]?.[p.x],cls=String(cell?.cls||"");
    if(/water/.test(cls)){tags.add("water");tags.add("river");tags.add("wet");notes.push("près de l’eau")}
    if(/forest/.test(cls)){tags.add("forest");notes.push("en milieu boisé")}
    if(/meadow|field|clearing/.test(cls)){tags.add("meadow");tags.add("hedge");notes.push("dans un milieu ouvert")}
    if(/scrub/.test(cls)){tags.add("scrub");tags.add("hedge")}
    if(/building|residential|road/.test(cls)){tags.add("village");tags.add("garden");tags.add("park");notes.push("près du bâti")}
    if(/quarry|rock|cavity/.test(cls)){tags.add("limestone");tags.add("quarry");tags.add("cavity");tags.add("rock");notes.push("sur un secteur rocheux")}
    const kind=String(cell?.feature?.kind||cell?.feature?.name||"").toLowerCase();if(/moulin|lavoir|patrimoine|monument|église|eglise|château|chateau/.test(kind)){tags.add("heritage");tags.add("village")}
  }
  const near=queryNormalizedPois(extentAroundPoint(loc,320));
  for(const p of near){
    if(p.category==="cavity"){tags.add("cavity");tags.add("limestone");tags.add("quarry")}
    if(p.category==="heritage")tags.add("heritage");
    const t=`${p.title||""} ${p.subtype||""}`.toLowerCase();if(/source|rivière|riviere|ruisseau|lavoir|moulin|étang|etang/.test(t)){tags.add("water");tags.add("river")}
  }
  return{tags,notes:[...new Set(notes)]};
}
function encounterTestContext(){
  const anchor=state.selectedCell?.coord||state.center||CONFIG.house;
  const context=encounterHabitatContext(anchor);
  const presets=[
    {tags:["forest","hedge"],note:"simulation en lisière boisée"},
    {tags:["water","river","wet"],note:"simulation près d’un cours d’eau"},
    {tags:["meadow","hedge"],note:"simulation en prairie"},
    {tags:["village","garden","heritage"],note:"simulation près du bâti ancien"},
    {tags:["limestone","quarry","cavity","rock"],note:"simulation sur terrain calcaire"}
  ];
  if(context.tags.size<=1){const preset=presets[Math.floor(Math.random()*presets.length)];for(const tag of preset.tags)context.tags.add(tag);context.notes.push(preset.note)}
  context.notes.unshift(state.selectedCell?"mode test sur la cellule sélectionnée":"mode test autour du centre de la carte");
  context.testMode=true;return context;
}
function chooseLocalEncounter(context=encounterHabitatContext()){
  const last=state.encounterLastId;
  let pool=LOCAL_ENCOUNTERS.filter(e=>e.habitats.some(h=>context.tags.has(h)));
  if(!pool.length)pool=LOCAL_ENCOUNTERS;
  const weighted=[];
  for(const e of pool){const rank=encounterStatusRank(encounterRecord(e.id)?.status),novelty=rank===0?2.6:rank===1?1.5:rank===2?.72:.42,repeat=e.id===last?.35:1,count=Math.max(1,Math.round((e.rarity||1)*novelty*repeat*10));for(let i=0;i<count;i++)weighted.push(e)}
  const entry=weighted[Math.floor(Math.random()*weighted.length)]||pool[0];state.encounterLastId=entry.id;return{entry,context};
}
function updateEncounterUI(message=""){
  const stats=encounterCollectionStats(),loc=state.userLocation;
  if(els.encounterEnabled)els.encounterEnabled.checked=state.encounterEnabled;
  if(els.observeSurroundings){els.observeSurroundings.disabled=!state.encounterEnabled||!loc||state.locationLoading;els.observeSurroundings.textContent=state.locationLoading?"⌖ localisation…":"⚔ observer"}
  if(els.testEncounter){els.testEncounter.disabled=!state.encounterEnabled||state.locationLoading;els.testEncounter.textContent="🧪 test"}
  if(els.encounterProgressBar)els.encounterProgressBar.style.width=`${stats.total?stats.identified/stats.total*100:0}%`;
  if(els.encounterStatus){
    if(message)els.encounterStatus.innerHTML=message;
    else if(!state.encounterEnabled)els.encounterStatus.innerHTML="Les rencontres sont désactivées. Le Codex reste consultable.";
    else if(!loc)els.encounterStatus.innerHTML=`<strong>${stats.identified}/${stats.total}</strong> fiches identifiées · localise-toi, ou lance un test sans GPS.`;
    else els.encounterStatus.innerHTML=`<strong>${stats.identified}/${stats.total}</strong> fiches identifiées · ${stats.deepened} approfondie${stats.deepened>1?"s":""}. Une nouvelle observation est possible.`;
  }
}
function openEncounterOverlay(title="Rencontre locale"){
  encounterRuntime.screen="encounter";els.encounterDialogTitle.textContent=title;els.encounterOverlay.classList.add("active");els.encounterOverlay.setAttribute("aria-hidden","false");document.body.classList.add("encounter-open");setTimeout(()=>els.encounterClose?.focus(),30)
}
function closeEncounterOverlay(){
  encounterRuntime.screen="closed";encounterRuntime.active=null;state.encounterSession=null;retroAudio.stopEncounterTheme();els.encounterOverlay.classList.remove("active");els.encounterOverlay.setAttribute("aria-hidden","true");document.body.classList.remove("encounter-open");els.encounterWindow.classList.remove("encounter-correct","encounter-wrong","encounter-win","encounter-flee");updateEncounterUI();
}
function encounterPips(value,max=3,kind="knowledge"){return `<span class="dq-pips ${kind}">${Array.from({length:max},(_,i)=>`<span class="${i<value?"on":""}">◆</span>`).join("")}</span>`}
const ENCOUNTER_VIGNETTES={
  "ecureuil-roux":`<svg viewBox="0 0 160 112" aria-hidden="true"><g opacity=".25" fill="#d7fff0"><circle cx="24" cy="24" r="2"/><circle cx="130" cy="18" r="1.5"/><circle cx="142" cy="38" r="1"/></g><path fill="#5e3b26" d="M20 0h25v112H20z"/><path fill="#765038" d="M33 49h88v11H33z"/><g class="dq-subject"><path fill="#c66b32" d="M92 46c16-20 38-10 34 11-3 17-22 18-29 6 15 1 21-10 14-15-5-4-12 2-19 8z"/><ellipse cx="78" cy="62" rx="20" ry="17" fill="#d67b3a"/><circle cx="66" cy="44" r="11" fill="#de8744"/><path fill="#de8744" d="M57 37l2-13 8 12m8 1l7-11 1 15"/><circle cx="63" cy="42" r="2.2" fill="#07142b"/><path d="M57 47q9 5 17 0" fill="none" stroke="#f7d2aa" stroke-width="2"/><path d="M75 75l-8 15m20-15 10 13" stroke="#7d3f25" stroke-width="5" stroke-linecap="round"/></g></svg>`,
  "herisson-europe":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#244b33" d="M0 76h160v36H0z"/><g opacity=".35" stroke="#9be5aa"><path d="M20 92l4-22m9 22 1-17m96 17-5-24m17 24-2-19"/></g><g class="dq-subject"><path fill="#6e503c" d="M33 70c5-31 58-43 87-10 9 10 10 23 6 31H44c-9-5-14-12-11-21z"/><path fill="#a38365" d="M39 68l-10-18 18 9-4-22 19 15 4-25 13 22 13-20 5 25 21-12-8 22z"/><path fill="#b99b7e" d="M91 66c13-9 31-3 38 7l-15 2c-6 8-16 13-29 13z"/><circle cx="115" cy="67" r="2.5" fill="#06111e"/><circle cx="130" cy="75" r="3" fill="#06111e"/><path d="M48 88l-4 9m57-9 4 9" stroke="#4c3428" stroke-width="4" stroke-linecap="round"/></g></svg>`,
  "salamandre-tachetee":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#193e2f" d="M0 68h160v44H0z"/><g opacity=".3" fill="#87d59d"><circle cx="26" cy="86" r="5"/><circle cx="134" cy="93" r="7"/><circle cx="48" cy="102" r="3"/></g><g class="dq-subject"><path d="M29 70c22-25 39-5 55-14 17-10 28-28 49-18 13 6 9 22-3 27-14 6-28 2-39 10-18 13-39 24-62 9-8-5-8-9 0-14z" fill="#11151a" stroke="#06090b" stroke-width="3"/><circle cx="123" cy="48" r="3" fill="#ffd832"/><circle cx="113" cy="54" r="6" fill="#ffd832"/><circle cx="92" cy="63" r="5" fill="#ffd832"/><circle cx="72" cy="70" r="4" fill="#ffd832"/><circle cx="49" cy="75" r="6" fill="#ffd832"/><path d="M74 71l-9 17m32-25 10-16m-56 27-9-14m70-7 13 12" stroke="#11151a" stroke-width="6" stroke-linecap="round"/><circle cx="134" cy="44" r="2" fill="#f2f2dc"/></g></svg>`,
  "martin-pecheur":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#13567a" d="M0 73h160v39H0z"/><path d="M0 86q22-8 44 0t44 0t44 0t44 0" fill="none" stroke="#7be2ff" stroke-width="3" opacity=".7"/><path fill="#65472f" d="M16 65h113v7H16z"/><g class="dq-subject"><ellipse cx="90" cy="54" rx="21" ry="17" fill="#1679a8"/><path fill="#ef7e3a" d="M71 54q18 12 38 0-3 19-20 19-16 0-18-19z"/><circle cx="106" cy="42" r="11" fill="#1d8bbd"/><path fill="#d8f7ff" d="M115 44l35 7-35 5z"/><circle cx="109" cy="40" r="2.5" fill="#06111e"/><path fill="#0d4d7c" d="M76 50l-22-21 30 10z"/><path d="M91 68v11m8-11 3 11" stroke="#452c25" stroke-width="3"/></g></svg>`,
  "lucane-cerf-volant":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#4b3424" d="M0 0h160v112H0z"/><g opacity=".18" stroke="#e6c79a" stroke-width="2"><path d="M15 0l32 112M61 0l-18 112m76-112-9 112m35-112-25 112"/></g><g class="dq-subject" fill="#21130f" stroke="#0a0706" stroke-width="2"><ellipse cx="82" cy="68" rx="24" ry="28"/><ellipse cx="82" cy="43" rx="16" ry="14"/><path d="M72 34C54 18 45 18 40 22c5 2 9 6 13 13-9-3-16-2-22 2 12 3 22 8 32 17m29-20c18-16 27-16 32-12-5 2-9 6-13 13 9-3 16-2 22 2-12 3-22 8-32 17" fill="none" stroke="#2a1711" stroke-width="7" stroke-linecap="round"/><path d="M60 55L42 45m20 23-22 0m24 14-18 11m58-38 18-10m-20 23h22M99 82l18 11" fill="none" stroke="#2a1711" stroke-width="5" stroke-linecap="round"/><path d="M82 49v45" stroke="#7b4430"/><circle cx="76" cy="39" r="2" fill="#d7aa69" stroke="none"/><circle cx="88" cy="39" r="2" fill="#d7aa69" stroke="none"/></g></svg>`,
  "chene-pedoncule":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#23452a" d="M0 79h160v33H0z"/><g class="dq-subject"><path fill="#704727" d="M70 45h21l-4 54H65z"/><path fill="#815436" d="M75 52L50 74m36-21 27 22m-31-15-6 28" stroke="#815436" stroke-width="8" stroke-linecap="round"/><circle cx="55" cy="42" r="28" fill="#32703b"/><circle cx="81" cy="29" r="31" fill="#3d8042"/><circle cx="107" cy="45" r="27" fill="#2d6a38"/><circle cx="74" cy="52" r="27" fill="#438a47"/><g fill="#c89743"><ellipse cx="50" cy="51" rx="3" ry="5"/><ellipse cx="94" cy="45" rx="3" ry="5"/><ellipse cx="113" cy="55" rx="3" ry="5"/></g></g></svg>`,
  "prunellier":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#244729" d="M0 80h160v32H0z"/><g class="dq-subject"><path d="M28 91Q58 45 133 35M54 88Q77 47 118 75M74 59Q57 37 41 31" fill="none" stroke="#57402f" stroke-width="5" stroke-linecap="round"/><g fill="#f7f0e1"><circle cx="45" cy="31" r="5"/><circle cx="60" cy="54" r="5"/><circle cx="76" cy="48" r="5"/><circle cx="94" cy="43" r="5"/><circle cx="116" cy="38" r="5"/><circle cx="112" cy="74" r="5"/></g><g fill="#4253a3"><circle cx="67" cy="71" r="5"/><circle cx="87" cy="59" r="5"/><circle cx="125" cy="52" r="5"/></g><path d="M55 51l-8-11m31 7 2-13m26 7 8-10" stroke="#b8c6b7" stroke-width="2"/></g></svg>`,
  "fougere-aigle":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#1b4328" d="M0 83h160v29H0z"/><g class="dq-subject" fill="none" stroke="#83d77a" stroke-linecap="round"><path d="M79 101Q77 57 80 18" stroke-width="5"/><path d="M80 31Q58 23 42 25M80 42Q57 33 34 39M79 54Q54 46 26 56M79 68Q54 61 33 75M80 31q21-13 38-9M80 43q26-13 46-4M80 55q25-7 49 4M79 69q26-3 45 13" stroke-width="4"/><path d="M65 29l-9-9m7 19-12-6m11 17-14-1m17 11-13 6m42-38 9-10m-8 21 13-7m-13 18 15 0m-17 13 14 8" stroke-width="3"/></g></svg>`,
  "calcaire-karst":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#bda98a" d="M0 18h160v94H0z"/><path d="M0 36h160M0 62h160M0 87h160" stroke="#8e7d65" stroke-width="2"/><path d="M34 18l-9 22 15 18-8 26 14 28m58-94 10 20-17 17 12 30-16 31" fill="none" stroke="#6b5e50" stroke-width="4"/><g class="dq-subject"><path fill="#2b2831" d="M48 112V80c0-22 13-36 32-36s32 14 32 36v32z"/><path d="M61 112V82c0-12 8-23 19-23s19 11 19 23v30" fill="#080d15"/><path d="M78 59q-4 22 2 53" stroke="#7d68a5" stroke-width="2" opacity=".7"/><circle cx="80" cy="80" r="4" fill="#cbb6ff" opacity=".65"/></g></svg>`,
  "ammonite":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#6f5b48" d="M0 0h160v112H0z"/><g opacity=".17" stroke="#e2cfad"><path d="M0 20h160M0 49h160M0 82h160M23 0l-8 112m54-112-7 112m57-112 9 112"/></g><g class="dq-subject"><circle cx="82" cy="58" r="40" fill="#c8aa72" stroke="#ead5a8" stroke-width="4"/><path d="M82 58c0-18 24-22 31-7 10 22-17 42-39 31-28-14-18-57 17-67" fill="none" stroke="#715638" stroke-width="7" stroke-linecap="round"/><path d="M82 58l-18-34m18 34 36-13M82 58l25 31M82 58 49 80" stroke="#92734e" stroke-width="3"/></g></svg>`,
  "lavoir":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#245a67" d="M0 83h160v29H0z"/><g class="dq-subject"><path fill="#a98b65" d="M24 44h112v52H24z"/><path fill="#59442f" d="M14 45L80 12l66 33z"/><path fill="#6e5038" d="M22 38h116v10H22z"/><path fill="#d8c7a4" d="M40 53h80v28H40z"/><path fill="#3183a0" d="M35 78h90v17H35z"/><path d="M40 86q16-7 32 0t32 0t32 0" fill="none" stroke="#9ceaff" stroke-width="3"/><path d="M34 48v49m92-49v49" stroke="#4a3729" stroke-width="8"/></g></svg>`,
  "moulin-eau":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#225d75" d="M0 81h160v31H0z"/><g class="dq-subject"><path fill="#c7ad82" d="M31 42h76v52H31z"/><path fill="#67482f" d="M23 43L69 15l47 28z"/><rect x="46" y="59" width="18" height="35" fill="#4b3628"/><rect x="78" y="54" width="17" height="17" fill="#80b8c8"/><circle cx="121" cy="72" r="28" fill="none" stroke="#6a4a31" stroke-width="7"/><circle cx="121" cy="72" r="5" fill="#6a4a31"/><path d="M121 44v56M93 72h56m-48-20 40 40m0-40-40 40" stroke="#6a4a31" stroke-width="4"/><path d="M0 93q22-8 44 0t44 0t44 0t44 0" fill="none" stroke="#8de5ff" stroke-width="3"/></g></svg>`,
  "chauve-souris":`<svg viewBox="0 0 160 112" aria-hidden="true"><path fill="#1b1a2a" d="M0 0h160v112H0z"/><path fill="#080a13" d="M0 112V64C16 23 48 7 80 7s64 16 80 57v48z"/><g opacity=".35" fill="#9b83c9"><circle cx="33" cy="28" r="1.4"/><circle cx="124" cy="21" r="1"/><circle cx="143" cy="46" r="1.5"/></g><g class="dq-subject" fill="#28243b" stroke="#a18bd1" stroke-width="2"><path d="M80 53C61 27 31 29 17 46c16-4 27 4 34 16-17-2-28 7-32 19 21-8 39 1 49 16z"/><path d="M80 53c19-26 49-24 63-7-16-4-27 4-34 16 17-2 28 7 32 19-21-8-39 1-49 16z"/><ellipse cx="80" cy="63" rx="13" ry="22"/><path d="M70 47l4-12 7 11m9 1-4-12-7 11"/></g><circle cx="75" cy="58" r="2" fill="#ffcf74"/><circle cx="85" cy="58" r="2" fill="#ffcf74"/></svg>`
};
function encounterFxLayer(){return `<div class="dq-fx-layer" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join("")}</div>`}
function encounterVignette(entry,{locked=false,mini=false}={}){
  const svg=ENCOUNTER_VIGNETTES[entry.id]||`<svg viewBox="0 0 160 112" aria-hidden="true"><g class="dq-subject"><circle cx="80" cy="55" r="35" fill="currentColor" opacity=".35"/><text x="80" y="69" text-anchor="middle" fill="#fff" font-size="42">?</text></g></svg>`;
  return `<div class="dq-vignette family-${escAttr(entry.family)} ${locked?"locked":""} ${mini?"dq-vignette-mini":""}" aria-label="${locked?"Vignette verrouillée":`Illustration de ${escAttr(entry.title)}`}">${svg}${locked?'<span class="dq-unknown-mark">?</span>':""}</div>`;
}
function encounterHeader(entry){return `<div class="dq-encounter-head">${encounterVignette(entry)}<div><div class="dq-name">${esc(entry.title)}</div><div class="dq-scientific">${esc(entry.scientificName)}</div><span class="dq-tag">${esc(encounterFamilyLabel(entry.family))}</span></div></div>${encounterFxLayer()}`}

function markEncounterSeen(entry){
  const old=encounterRecord(entry.id)||{};state.encounterCollection[entry.id]={...old,status:old.status||"seen",attempts:(old.attempts||0)+1,lastEncounter:new Date().toISOString()};saveEncounterCollection();updateEncounterUI();
}
function startLocalEncounter({testMode=false}={}){
  if(!state.encounterEnabled){updateEncounterUI("Active d’abord le mode rencontre.");return}
  if(!testMode&&!state.userLocation){updateEncounterUI('<span style="color:var(--warn)">Une position ponctuelle est nécessaire avant d’observer.</span>');locateUser();return}
  const context=testMode?encounterTestContext():encounterHabitatContext();
  const {entry}=chooseLocalEncounter(context);if(!testMode)markEncounterSeen(entry);
  state.encounterSession={entryId:entry.id,questionIndex:0,knowledge:0,flee:0,answered:false,context:[...context.tags],testMode};encounterRuntime.active=entry;
  openEncounterOverlay(testMode?"Rencontre test":"Rencontre locale");retroAudio.play("encounterStart");retroAudio.startEncounterTheme(entry.family);renderEncounterIntro(entry,context);setTimeout(()=>retroAudio.play(`encounterFamily${entry.family.charAt(0).toUpperCase()+entry.family.slice(1)}`),115);setTimeout(()=>retroAudio.play("encounterReveal"),260);
}
function renderEncounterIntro(entry,context){
  const habitat=context.notes.length?`Contexte cartographique : ${context.notes.join(", ")}.`:"Contexte cartographique général.";
  const testNote=context.testMode?'<div class="dq-note encounter-test-note"><strong>MODE TEST</strong> · aucune progression du Codex ne sera enregistrée.</div>':"";
  els.encounterBody.innerHTML=`${encounterHeader(entry)}<div class="dq-dialogue">${esc(entry.intro)}</div><div class="dq-bars"><div class="dq-meter">CONNAISSANCE ${encounterPips(0)}</div><div class="dq-meter">FUITE ${encounterPips(0,3,"flee")}</div></div><div class="dq-actions"><button class="dq-action primary" type="button" data-encounter-action="begin" data-audio-quiet>Observer</button><button class="dq-action danger" type="button" data-encounter-action="flee" data-audio-quiet>Passer son chemin</button></div><div class="dq-note">${esc(habitat)} Rencontre ludique : elle ne constitue pas une observation naturaliste ou patrimoniale réelle.</div>${testNote}`;
}
function encounterQuestionOrder(entry,index){
  const q=entry.questions[index],choices=q.a.map((text,i)=>({text,original:i}));
  for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}
  return{q,choices};
}
function renderEncounterQuestion(){
  const session=state.encounterSession,entry=ENCOUNTER_BY_ID.get(session?.entryId);if(!session||!entry)return;
  retroAudio.play("encounterTurn");
  const {q,choices}=encounterQuestionOrder(entry,session.questionIndex);session.currentChoices=choices;session.answered=false;
  els.encounterBody.innerHTML=`${encounterHeader(entry)}<div class="dq-bars"><div class="dq-meter">CONNAISSANCE ${encounterPips(session.knowledge)}</div><div class="dq-meter">FUITE ${encounterPips(session.flee,3,"flee")}</div></div><div class="dq-dialogue"><strong>Tour ${session.questionIndex+1}/3</strong><br>${esc(q.q)}</div><div class="dq-choices">${choices.map((c,i)=>`<button class="dq-choice" type="button" data-encounter-choice="${i}" data-audio-quiet>${esc(c.text)}</button>`).join("")}</div><div class="dq-actions"><button class="dq-action danger" type="button" data-encounter-action="flee" data-audio-quiet>Abandonner</button></div>`;
}
function answerEncounter(choiceIndex){
  const session=state.encounterSession,entry=ENCOUNTER_BY_ID.get(session?.entryId);if(!session||!entry||session.answered)return;
  const q=entry.questions[session.questionIndex],choice=session.currentChoices?.[choiceIndex];if(!choice)return;session.answered=true;
  const correct=choice.original===q.ok;if(correct){session.knowledge++;retroAudio.play("encounterCorrect")}else{session.flee++;retroAudio.play("encounterWrong")}
  els.encounterWindow.classList.remove("encounter-correct","encounter-wrong","encounter-win","encounter-flee");void els.encounterWindow.offsetWidth;els.encounterWindow.classList.add(correct?"encounter-correct":"encounter-wrong");
  els.encounterBody.innerHTML=`${encounterHeader(entry)}<div class="dq-bars"><div class="dq-meter">CONNAISSANCE ${encounterPips(session.knowledge)}</div><div class="dq-meter">FUITE ${encounterPips(session.flee,3,"flee")}</div></div><div class="dq-dialogue"><strong>${correct?"Bonne lecture !":"La créature se méfie…"}</strong><br>${esc(q.e)}</div><div class="dq-actions"><button class="dq-action primary" type="button" data-encounter-action="continue" data-audio-quiet>${session.flee>=2||session.questionIndex>=2?"Voir l’issue":"Tour suivant"}</button></div>`;
}
function continueEncounter(){
  const s=state.encounterSession;if(!s)return;
  if(s.flee>=2||s.questionIndex>=2){finishEncounter(s.knowledge>=2);return}
  s.questionIndex++;renderEncounterQuestion();
}
function finishEncounter(win){
  const session=state.encounterSession,entry=ENCOUNTER_BY_ID.get(session?.entryId);if(!session||!entry)return;
  const testMode=!!session.testMode,old=encounterRecord(entry.id)||{};
  if(win){
    const previous=encounterStatusRank(old.status),status=previous>=2?"deepened":"identified";
    if(!testMode){state.encounterCollection[entry.id]={...old,status,wins:(old.wins||0)+1,lastWin:new Date().toISOString()};saveEncounterCollection()}
    retroAudio.play("encounterWin");els.encounterWindow.classList.remove("encounter-correct","encounter-wrong","encounter-flee");void els.encounterWindow.offsetWidth;els.encounterWindow.classList.add("encounter-win");
    const heading=testMode?"TEST RÉUSSI":previous>=2?"CONNAISSANCE APPROFONDIE":"FICHE DÉVERROUILLÉE";
    const actions=testMode?'<button class="dq-action primary" type="button" data-encounter-action="retry" data-audio-quiet>Tester une autre rencontre</button><button class="dq-action" type="button" data-encounter-action="close" data-audio-quiet>Retour à l’Atlas</button>':`<button class="dq-action primary" type="button" data-encounter-action="codex-entry" data-entry-id="${escAttr(entry.id)}" data-audio-quiet>Ouvrir la fiche</button><button class="dq-action" type="button" data-encounter-action="close" data-audio-quiet>Retour à l’Atlas</button>`;
    const note=testMode?'<div class="dq-note encounter-test-note">Aucune fiche n’a été ajoutée au Codex pendant ce test.</div>':"";
    els.encounterBody.innerHTML=`${encounterHeader(entry)}<div class="dq-dialogue"><strong>${heading}</strong><br>${esc(entry.summary)}</div>${renderUnlockedEncounterFacts(entry)}${note}<div class="dq-actions">${actions}</div>`;
  }else{
    if(!testMode){state.encounterCollection[entry.id]={...old,status:old.status||"seen",losses:(old.losses||0)+1};saveEncounterCollection()}
    retroAudio.play("encounterFlee");els.encounterWindow.classList.remove("encounter-correct","encounter-wrong","encounter-win");void els.encounterWindow.offsetWidth;els.encounterWindow.classList.add("encounter-flee");
    const testNote=testMode?'<div class="dq-note encounter-test-note">Mode test : le Codex reste inchangé.</div>':"";
    els.encounterBody.innerHTML=`${encounterHeader(entry)}<div class="dq-dialogue"><strong>LA RENCONTRE S’ÉCHAPPE</strong><br>${esc(entry.title)} disparaît avant que l’observation soit complète. ${testMode?"Tu peux relancer immédiatement une autre simulation.":"Quelques indices restent consignés ; une future rencontre proposera une nouvelle chance."}</div>${testNote}<div class="dq-actions"><button class="dq-action primary" type="button" data-encounter-action="retry" data-audio-quiet>${testMode?"Tester encore":"Observer encore"}</button><button class="dq-action" type="button" data-encounter-action="close" data-audio-quiet>Retour à l’Atlas</button></div>`;
  }
  updateEncounterUI();
}
function fleeEncounter(){
  const session=state.encounterSession,entry=ENCOUNTER_BY_ID.get(session?.entryId);retroAudio.play("encounterFlee");els.encounterWindow.classList.remove("encounter-correct","encounter-wrong","encounter-win");void els.encounterWindow.offsetWidth;els.encounterWindow.classList.add("encounter-flee");
  const testNote=session?.testMode?'<div class="dq-note encounter-test-note">Mode test : aucune progression n’a été enregistrée.</div>':"";
  if(entry)els.encounterBody.innerHTML=`${encounterHeader(entry)}<div class="dq-dialogue">Tu laisses la rencontre poursuivre sa route. Aucun problème : le territoire ne réclame pas toujours un duel de connaissances.</div>${testNote}<div class="dq-actions"><button class="dq-action" type="button" data-encounter-action="close" data-audio-quiet>Retour à l’Atlas</button></div>`;else closeEncounterOverlay();
}
function renderUnlockedEncounterFacts(entry){return `<div class="codex-facts">${entry.facts.map(f=>`<div class="codex-fact">${esc(f)}</div>`).join("")}</div><div class="dq-note">${esc(entry.source)} · Fiche pédagogique générale, à compléter par une observation ou une source locale documentée.</div>`}
function openCodex(entryId=""){
  openEncounterOverlay("Codex du territoire");retroAudio.play("codexOpen");retroAudio.startEncounterTheme("codex");entryId?renderCodexEntry(entryId):renderCodexList();
}
function renderCodexList(){
  encounterRuntime.screen="codex";const stats=encounterCollectionStats();
  els.encounterBody.innerHTML=`<div class="dq-dialogue"><strong>CODEX DU TERRITOIRE</strong><br>${stats.identified} fiches identifiées sur ${stats.total}. Les silhouettes aperçues restent consultables, mais leur savoir détaillé demeure verrouillé.</div><div class="codex-grid">${LOCAL_ENCOUNTERS.map(e=>{const r=encounterRecord(e.id),status=r?.status||"locked",label=status==="deepened"?"Approfondie":status==="identified"?"Identifiée":status==="seen"?"Aperçue":"Inconnue",locked=status==="locked";return `<button class="codex-entry ${locked?"locked":""}" data-codex-entry="${escAttr(e.id)}" data-status="${escAttr(status)}" type="button" data-audio-quiet>${encounterVignette(e,{locked,mini:true})}<span><strong>${locked?"???":esc(e.title)}</strong><span>${esc(encounterFamilyLabel(e.family))} · ${label}</span></span></button>`}).join("")}</div><div class="dq-actions"><button class="dq-action" type="button" data-encounter-action="close" data-audio-quiet>Fermer</button></div>`;
}
function renderCodexEntry(id){
  const entry=ENCOUNTER_BY_ID.get(id);if(!entry){renderCodexList();return}const record=encounterRecord(id),rank=encounterStatusRank(record?.status);
  encounterRuntime.screen="codex-entry";
  if(rank<1){renderCodexList();return}
  els.encounterBody.innerHTML=`<button class="dq-action codex-back" type="button" data-encounter-action="codex" data-audio-quiet>← Codex</button>${encounterHeader(entry)}<div class="codex-card"><div class="dq-dialogue"><strong>${rank>=2?esc(entry.summary):"Silhouette aperçue. Réussis une rencontre pour déverrouiller la fiche complète."}</strong></div>${rank>=2?renderUnlockedEncounterFacts(entry):""}${rank>=3?'<div class="dq-note" style="color:#ffe178">Niveau approfondi : cette fiche a été remportée plusieurs fois.</div>':""}</div>`;
}
function handleEncounterClick(ev){
  const choice=ev.target.closest?.("[data-encounter-choice]");if(choice){answerEncounter(Number(choice.dataset.encounterChoice));return}
  const codex=ev.target.closest?.("[data-codex-entry]");if(codex){retroAudio.play("codexPage");renderCodexEntry(codex.dataset.codexEntry);return}
  const action=ev.target.closest?.("[data-encounter-action]")?.dataset.encounterAction;if(!action)return;
  if(action==="begin"){retroAudio.play("button");renderEncounterQuestion()}
  else if(action==="continue")continueEncounter();
  else if(action==="flee")fleeEncounter();
  else if(action==="close")closeEncounterOverlay();
  else if(action==="retry"){const testMode=!!state.encounterSession?.testMode;closeEncounterOverlay();setTimeout(()=>startLocalEncounter({testMode}),80)}
  else if(action==="codex"){retroAudio.play("codexPage");renderCodexList()}
  else if(action==="codex-entry"){retroAudio.play("codexPage");renderCodexEntry(ev.target.closest("[data-entry-id]")?.dataset.entryId||state.encounterSession?.entryId)};
}

function relationZoomForDistance(distance){
  if(distance<=180)return 5;if(distance<=480)return 4;if(distance<=1050)return 3;if(distance<=2400)return 2;if(distance<=5200)return 1;return 0;
}
function gridCellClientRect(x,y){
  if(CANVAS_RENDERER)return canvasCellRect(x,y);
  return els.map?.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`)?.getBoundingClientRect()||null;
}
function clearActiveRelation(){
  clearTimeout(relationRuntime.timer);relationRuntime.timer=0;state.activeRelation=null;
  if(els.relationOverlay)els.relationOverlay.classList.remove("visible");
}
function updateRelationOverlay(){
  const rel=state.activeRelation,svg=els.relationOverlay;if(!rel||!svg||!state.lastGrid||drag){svg?.classList.remove("visible");return}
  const from=normalizedPoiByUid(rel.fromUid),to=normalizedPoiByUid(rel.toUid);if(!from||!to){clearActiveRelation();return}
  const a=coordToGrid(from.lat,from.lon,state.lastGrid.extent),b=coordToGrid(to.lat,to.lon,state.lastGrid.extent);
  if(a.x<0||a.x>=CONFIG.gridW||a.y<0||a.y>=CONFIG.gridH||b.x<0||b.x>=CONFIG.gridW||b.y<0||b.y>=CONFIG.gridH){svg.classList.remove("visible");return}
  const ar=gridCellClientRect(a.x,a.y),br=gridCellClientRect(b.x,b.y),vr=els.viewport.getBoundingClientRect();if(!ar||!br)return;
  const width=Math.max(1,els.viewport.scrollWidth),height=Math.max(1,els.viewport.scrollHeight);
  svg.style.width=`${width}px`;svg.style.height=`${height}px`;svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
  const x1=ar.left+ar.width/2-vr.left+els.viewport.scrollLeft,y1=ar.top+ar.height/2-vr.top+els.viewport.scrollTop;
  const x2=br.left+br.width/2-vr.left+els.viewport.scrollLeft,y2=br.top+br.height/2-vr.top+els.viewport.scrollTop;
  els.relationLine.setAttribute("x1",x1);els.relationLine.setAttribute("y1",y1);els.relationLine.setAttribute("x2",x2);els.relationLine.setAttribute("y2",y2);
  els.relationStart.setAttribute("cx",x1);els.relationStart.setAttribute("cy",y1);els.relationEnd.setAttribute("cx",x2);els.relationEnd.setAttribute("cy",y2);
  els.relationLabel.setAttribute("x",(x1+x2)/2);els.relationLabel.setAttribute("y",(y1+y2)/2-8);els.relationLabel.textContent=rel.label||"relation";
  svg.classList.add("visible");
}
function framePoiRelation(fromUid,toUid,label="relation"){
  const from=normalizedPoiByUid(fromUid),to=normalizedPoiByUid(toUid);if(!from||!to)return;
  state.guidedTourActive=false;document.body.classList.remove("tour-active");els.tourMarker?.classList.remove("visible");
  const distance=distanceMeters(from,to),zoom=relationZoomForDistance(distance);
  state.zoomIndex=zoom;state.depthIndex=0;state.center=clampCenter({lat:(from.lat+to.lat)/2,lon:(from.lon+to.lon)/2},CONFIG.zooms[zoom]);
  clearTimeout(relationRuntime.timer);state.activeRelation={fromUid,toUid,label};render("relation");
  relationRuntime.timer=setTimeout(clearActiveRelation,10000);requestAnimationFrame(updateRelationOverlay);retroAudio.play("select");
}
function ensurePoiLayerVisible(poi){
  if(!poi)return;
  if(poi.category==="bss"){state.layerBss=true;if(els.layerBss)els.layerBss.checked=true}
  else if(poi.category==="cavity"){state.layerCavities=true;if(els.layerCavities)els.layerCavities.checked=true}
  else if(poi.category==="heritage"){
    state.layerHeritage=true;if(els.layerHeritage)els.layerHeritage.checked=true;
    const key=poi.raw?.category;if(key&&key in state.heritageEnabled){state.heritageEnabled[key]=true;const toggle={monument:els.heritageMonuments,garden:els.heritageGardens,house:els.heritageHomes,museum:els.heritageMuseums,wikipedia:els.heritageWikipedia}[key];if(toggle)toggle.checked=true}
  }else if(poi.category==="industrial"){
    if(poi.sourceType==="cartofriches"){state.layerCartofriches=true;if(els.layerCartofriches)els.layerCartofriches.checked=true}else{state.layerLore=true;if(els.layerLore)els.layerLore.checked=true}
  }else if(poi.category==="memory"){
    if(poi.sourceType==="observation"){state.layerObservations=true;if(els.layerObservations)els.layerObservations.checked=true}else{state.layerLore=true;if(els.layerLore)els.layerLore.checked=true}
  }else if(poi.category==="home"){state.layerHouse=true;if(els.layerHouse)els.layerHouse.checked=true}
}
function focusNormalizedPoi(uid){
  const poi=normalizedPoiByUid(uid);if(!poi)return;
  state.guidedTourActive=false;document.body.classList.remove("tour-active");els.tourMarker?.classList.remove("visible");
  clearActiveRelation();ensurePoiLayerVisible(poi);if(state.zoomIndex<3)state.zoomIndex=3;
  if(poi.category!=="cavity")state.depthIndex=0;
  state.center=clampCenter({lat:poi.lat,lon:poi.lon},currentZoom());render("poi-navigation");
  requestAnimationFrame(()=>{if(!state.lastGrid)return;const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent);selectGridCell(p.x,p.y,{assist:false,note:"Lieu ouvert depuis une relation ou la proximité",showAssist:false})});
}


const GUIDED_TOUR_BLUEPRINTS=[
  {
    id:"water",title:"Eau, vallées et moulins",icon:"≈",
    intro:"Suivre les traces de l’eau dans le paysage : sources, moulins, lavoirs, ponts, vallons et repères documentaires proches des cours d’eau."
  },
  {
    id:"stone",title:"Les traces de la pierre",icon:"▧",
    intro:"Lire l’extraction, la roche et leurs empreintes : carrières, cavités, friches, ouvrages BSS et lieux dont le vocabulaire évoque la pierre."
  },
  {
    id:"heritage",title:"Patrimoine discret",icon:"◇",
    intro:"Une promenade parmi les lieux patrimoniaux, les bâtiments anciens et les mémoires locales, sans réduire le territoire aux seuls monuments officiels."
  },
  {
    id:"underground",title:"Sous le paysage",icon:"⌄",
    intro:"Un parcours critique entre cavités, forages et indices naturels, pour distinguer ce qui est documenté de ce qui reste interprétatif."
  },
  {
    id:"discovery",title:"Premiers repères de l’Atlas",icon:"✦",
    intro:"Une sélection diversifiée des lieux les plus significatifs actuellement chargés, ordonnée comme une promenade depuis la maison."
  }
];
function guidedTourPoiText(poi){
  const raw=poi?.raw||{};
  return [poi?.title,poi?.kind,poi?.subtype,poi?.description,poi?.source,raw.name,raw.nom,raw.designation,raw.description,raw.note,raw.period,raw.periode,raw.commune,raw.place,raw.lieu_dit,raw.tags?.natural,raw.tags?.historic,raw.tags?.amenity].filter(Boolean).join(" ").toLowerCase();
}
function guidedTourKeywordScore(text,words,weight=12){
  let score=0;for(const word of words)if(text.includes(word))score+=weight;return score;
}
function guidedTourCandidateScore(blueprint,poi){
  if(!poi||poi.sourceType==="location")return -Infinity;
  const text=guidedTourPoiText(poi),category=poi.category;
  let score=Math.max(0,poi.priority||0)*.35;
  if(blueprint.id==="water"){
    score+=guidedTourKeywordScore(text,["eau","ruisseau","rivière","riviere","source","fontaine","lavoir","moulin","pont","vallée","vallee","vallon","étang","etang","marais","canal","résurgence","resurgence"],18);
    if(poi.sourceType==="osm-natural"&&(text.includes("spring")||text.includes("sinkhole")))score+=54;
    if(category==="natural")score+=10;if(category==="heritage"||category==="memory")score+=8;
  }else if(blueprint.id==="stone"){
    if(category==="cavity")score+=72;if(category==="industrial")score+=56;if(category==="bss")score+=17;
    score+=guidedTourKeywordScore(text,["carrière","carriere","pierre","roche","calcaire","mine","souterrain","four","chaux","excav","falaise","cavité","cavite"],20);
  }else if(blueprint.id==="heritage"){
    if(category==="heritage")score+=74;if(category==="memory")score+=24;if(category==="industrial")score+=8;
    score+=guidedTourKeywordScore(text,["église","eglise","chapelle","château","chateau","croix","logis","moulin","lavoir","jardin","musée","musee","monument","historique","ancien","ruine","patrimoine"],17);
  }else if(blueprint.id==="underground"){
    if(category==="cavity")score+=82;if(category==="bss")score+=42;if(category==="industrial")score+=28;if(category==="natural")score+=14;
    score+=guidedTourKeywordScore(text,["cavité","cavite","grotte","gouffre","carrière","carriere","forage","puits","piézo","piezo","source","résurgence","resurgence","souterrain"],20);
  }else{
    if(category==="home")score-=25;else score+=18;
    if(["heritage","cavity","industrial","memory","natural"].includes(category))score+=18;
  }
  return score;
}
function guidedTourSelectCandidates(blueprint,maxSteps=7){
  ensureSpatialIndexes();
  const ranked=spatialRuntime.normalizedPois
    .filter(p=>p.sourceType!=="location")
    .map(p=>({poi:p,score:guidedTourCandidateScore(blueprint,p)}))
    .filter(e=>Number.isFinite(e.score)&&e.score>=(blueprint.id==="discovery"?18:blueprint.id==="water"?20:28))
    .sort((a,b)=>b.score-a.score||b.poi.priority-a.poi.priority||a.poi.title.localeCompare(b.poi.title,"fr"));
  const selected=[],perCategory=new Map();
  for(const entry of ranked){
    const p=entry.poi,category=p.category,count=perCategory.get(category)||0;
    const cap=blueprint.id==="underground"?(category==="bss"?3:4):blueprint.id==="discovery"?2:3;
    if(count>=cap)continue;
    if(selected.some(s=>distanceMeters(s.poi,p)<75))continue;
    selected.push(entry);perCategory.set(category,count+1);
    if(selected.length>=maxSteps)break;
  }
  if(selected.length<3){
    for(const entry of ranked){
      if(selected.some(s=>s.poi.uid===entry.poi.uid))continue;
      selected.push(entry);if(selected.length>=Math.min(maxSteps,ranked.length))break;
    }
  }
  const anchor=state.userLocation||CONFIG.house,remaining=selected.map(e=>e.poi),ordered=[];
  let cursor=anchor;
  while(remaining.length){
    remaining.sort((a,b)=>distanceMeters(cursor,a)-distanceMeters(cursor,b)||b.priority-a.priority);
    const next=remaining.shift();ordered.push(next);cursor=next;
  }
  return ordered;
}
function guidedTourTotalDistance(steps){
  let total=0;for(let i=1;i<steps.length;i++)total+=distanceMeters(steps[i-1],steps[i]);return total;
}
function rebuildGuidedTours(force=false){
  ensureSpatialIndexes();
  const revision=descriptionRuntime.revision,count=spatialRuntime.normalizedPois.length;
  if(!force&&guidedTourRuntime.revision===revision&&guidedTourRuntime.count===count)return false;
  const tours=[];
  for(const blueprint of GUIDED_TOUR_BLUEPRINTS){
    const steps=guidedTourSelectCandidates(blueprint,blueprint.id==="discovery"?8:7);
    if(steps.length<3)continue;
    tours.push({...blueprint,steps,totalDistance:guidedTourTotalDistance(steps)});
  }
  guidedTourRuntime.revision=revision;guidedTourRuntime.count=count;guidedTourRuntime.tours=tours;guidedTourRuntime.byId=new Map(tours.map(t=>[t.id,t]));
  if(!guidedTourRuntime.byId.has(state.guidedTourId))state.guidedTourId=tours[0]?.id||"";
  state.guidedTourStep=clamp(state.guidedTourStep,0,Math.max(0,(guidedTourRuntime.byId.get(state.guidedTourId)?.steps.length||1)-1));
  return true;
}
function guidedTourCurrent(){rebuildGuidedTours();return guidedTourRuntime.byId.get(state.guidedTourId)||null}
function guidedTourStepNarrative(tour,poi,index){
  const category=poiCategoryLabel(poi.category),kind=poi.kind||category.toLowerCase();
  const source=poi.source?`Source : ${poi.source}.`:"";
  if(tour.id==="water"){
    const cue=poi.category==="natural"?"Observe la manière dont ce repère naturel s’inscrit dans la pente et le réseau de vallons.":poi.category==="heritage"?"Ce lieu montre comment l’eau a pu structurer les usages, les franchissements ou le bâti.":"Le lien avec l’eau repose ici sur le nom, la fonction ou la proximité paysagère du repère.";
    return `${cue} ${source}`.trim();
  }
  if(tour.id==="stone"){
    const cue=poi.category==="cavity"?"La présence de la cavité est documentée comme repère, mais son volume, sa profondeur locale et ses connexions ne le sont pas nécessairement.":poi.category==="industrial"?"Cherche ici la trace d’un usage ancien du sol ou de la roche, sans confondre inventaire de site et état actuel du terrain.":poi.category==="bss"?"Cet ouvrage renseigne la verticale du sous-sol ; il ne prouve ni galerie ni continuité avec une carrière voisine.":"Ce point participe au vocabulaire minéral du secteur.";
    return `${cue} ${source}`.trim();
  }
  if(tour.id==="heritage"){
    return `Ce ${kind.toLowerCase()} est retenu pour sa valeur documentaire ou mémorielle. Regarde autant sa relation au paysage et aux voies proches que son statut propre. ${source}`.trim();
  }
  if(tour.id==="underground"){
    const cue=poi.category==="cavity"?"Point attesté en surface ou dans un inventaire, mais coupe souterraine interprétative.":poi.category==="bss"?"Donnée verticale utile pour comprendre les terrains traversés, sans cartographier un vide souterrain.":poi.category==="natural"?"Indice naturel à replacer dans le relief, sans extrapoler automatiquement une circulation karstique.":"Trace industrielle ou documentaire susceptible d’éclairer le sous-sol, avec prudence.";
    return `${cue} À cette étape, la bonne question est moins « que cache exactement le sol ? » que « qu’est-ce que la source permet réellement d’affirmer ? » ${source}`.trim();
  }
  return `Ce repère de type ${category.toLowerCase()} offre un bon point d’entrée dans l’Atlas. Compare sa fiche, les lieux voisins et le niveau de confiance des informations affichées. ${source}`.trim();
}
function guidedTourStepMeta(tour,poi,index){
  const parts=[poiCategoryLabel(poi.category)];
  if(index>0){const d=distanceMeters(tour.steps[index-1],poi);parts.push(d<1000?`${Math.round(d/10)*10} m depuis l’étape précédente`:`${(d/1000).toFixed(1).replace(".",",")} km depuis l’étape précédente`)}
  const homeDistance=distanceMeters(CONFIG.house,poi);parts.push(homeDistance<1000?`${Math.round(homeDistance/10)*10} m de la maison`:`${(homeDistance/1000).toFixed(1).replace(".",",")} km de la maison`);
  return parts.join(" · ");
}
function guidedTourDepthForStep(tour,poi,index){
  if(tour?.id!=="underground")return 0;
  if(poi.category==="cavity")return index%2?3:2;
  if(poi.category==="bss")return 1;
  return 0;
}
function guidedTourZoomForStep(tour,poi,index){
  const previous=tour?.steps?.[index-1]||null;
  if(previous){
    const fit=relationZoomForDistance(distanceMeters(previous,poi));
    return clamp(fit,2,4);
  }
  if(tour?.id==="underground"&&poi.category==="bss")return 3;
  return 4;
}
function updateGuidedTourMarker(){
  const marker=els.tourMarker,tour=guidedTourCurrent();
  if(!marker||!state.guidedTourActive||!tour||!state.lastGrid||drag){marker?.classList.remove("visible");return}
  const poi=tour.steps[state.guidedTourStep];if(!poi||!inExtent(poi.lat,poi.lon,state.lastGrid.extent)){marker.classList.remove("visible");return}
  const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent);marker.dataset.step=String(state.guidedTourStep+1);
  if(CANVAS_RENDERER){positionCanvasMarker(marker,p.x,p.y,true);return}
  const r=gridCellClientRect(p.x,p.y),vr=els.viewport.getBoundingClientRect();if(!r){marker.classList.remove("visible");return}
  marker.style.left=`${r.left-vr.left+els.viewport.scrollLeft}px`;marker.style.top=`${r.top-vr.top+els.viewport.scrollTop}px`;marker.style.width=`${r.width}px`;marker.style.height=`${r.height}px`;marker.classList.add("visible");
}
function updateGuidedTourUI(){
  const catalogChanged=rebuildGuidedTours();
  if(catalogChanged&&els.guidedTourSelect){
    const previous=state.guidedTourId;
    els.guidedTourSelect.innerHTML=guidedTourRuntime.tours.length?guidedTourRuntime.tours.map(t=>`<option value="${escAttr(t.id)}">${esc(t.icon)} ${esc(t.title)} · ${t.steps.length} étapes</option>`).join(""):'<option value="">Aucun parcours disponible</option>';
    if(guidedTourRuntime.byId.has(previous))state.guidedTourId=previous;else state.guidedTourId=guidedTourRuntime.tours[0]?.id||"";
    els.guidedTourSelect.value=state.guidedTourId;
  }
  const tour=guidedTourCurrent();
  if(!tour){
    els.guidedTourIntro.textContent="Synchronise ou importe quelques points d’intérêt pour composer des parcours.";els.guidedTourStart.disabled=true;els.guidedTourPanel.classList.remove("active");document.body.classList.remove("tour-active");els.tourMarker?.classList.remove("visible");return;
  }
  els.guidedTourStart.disabled=false;els.guidedTourSelect.value=tour.id;
  if(!state.guidedTourActive){
    els.guidedTourIntro.innerHTML=`<strong>${esc(tour.icon)} ${esc(tour.title)}</strong><br>${esc(tour.intro)}<br><span style="color:#9386a7">${tour.steps.length} étapes · environ ${tour.totalDistance<1000?`${Math.round(tour.totalDistance/10)*10} m`:`${(tour.totalDistance/1000).toFixed(1).replace(".",",")} km`} entre les étapes.</span>`;
    els.guidedTourPanel.classList.remove("active");document.body.classList.remove("tour-active");els.tourMarker?.classList.remove("visible");return;
  }
  document.body.classList.add("tour-active");els.guidedTourPanel.classList.add("active");
  const index=clamp(state.guidedTourStep,0,tour.steps.length-1),poi=tour.steps[index];state.guidedTourStep=index;
  els.guidedTourProgressText.textContent=`Étape ${index+1} sur ${tour.steps.length}`;
  els.guidedTourDistance.textContent=tour.totalDistance<1000?`≈ ${Math.round(tour.totalDistance/10)*10} m`:`≈ ${(tour.totalDistance/1000).toFixed(1).replace(".",",")} km`;
  els.guidedTourProgressBar.style.width=`${((index+1)/tour.steps.length)*100}%`;
  els.guidedTourStep.innerHTML=`<span class="guided-tour-step-tag">${esc(tour.icon)} ${esc(tour.title)}</span><h3>${esc(poi.title)}</h3><p>${esc(guidedTourStepNarrative(tour,poi,index))}</p><div class="guided-tour-step-meta">${esc(guidedTourStepMeta(tour,poi,index))}</div>`;
  els.guidedTourPrev.disabled=index===0;els.guidedTourNext.disabled=index===tour.steps.length-1;
  requestAnimationFrame(updateGuidedTourMarker);
}
function focusGuidedTourStep(index,{announce=true}={}){
  const tour=guidedTourCurrent();if(!tour||!tour.steps.length)return;
  state.guidedTourActive=true;state.guidedTourStep=clamp(index,0,tour.steps.length-1);
  const poi=tour.steps[state.guidedTourStep],previous=tour.steps[state.guidedTourStep-1]||null;
  ensurePoiLayerVisible(poi);state.zoomIndex=guidedTourZoomForStep(tour,poi,state.guidedTourStep);state.depthIndex=guidedTourDepthForStep(tour,poi,state.guidedTourStep);
  state.center=clampCenter({lat:poi.lat,lon:poi.lon},currentZoom());
  clearTimeout(relationRuntime.timer);relationRuntime.timer=0;state.activeRelation=previous?{fromUid:previous.uid,toUid:poi.uid,label:`étape ${state.guidedTourStep+1}`} : null;
  render("guided-tour");
  requestAnimationFrame(()=>{
    if(!state.lastGrid)return;const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent);
    selectGridCell(p.x,p.y,{assist:false,note:`Parcours « ${tour.title} » · étape ${state.guidedTourStep+1}`,showAssist:false});updateGuidedTourMarker();
  });
  if(announce)retroAudio.play("poiConfirm");
}
function startGuidedTour(){
  rebuildGuidedTours(true);const id=els.guidedTourSelect.value||guidedTourRuntime.tours[0]?.id;if(!id)return;
  state.guidedTourId=id;state.guidedTourStep=0;state.guidedTourActive=true;focusGuidedTourStep(0);
}
function stopGuidedTour(){
  state.guidedTourActive=false;state.guidedTourStep=0;document.body.classList.remove("tour-active");els.tourMarker?.classList.remove("visible");clearActiveRelation();updateGuidedTourUI();retroAudio.play("panelClose");
}

function queryOsmFeatures(extent){
  ensureSpatialIndexes();
  const candidates=spatialRuntime.osmIndex.query(extent);
  spatialRuntime.lastQueryCandidates+=candidates.length;
  const results=candidates.filter(f=>coordsIntersectExtent(f,extent));
  spatialRuntime.lastQueryResults+=results.length;
  return results;
}
function queryCadastreFeatures(extent,kind){
  ensureSpatialIndexes();
  const candidates=spatialRuntime.cadastreIndex.query(extent);
  spatialRuntime.lastQueryCandidates+=candidates.length;
  const results=candidates.filter(v=>(!kind||v.kind===kind)&&coordsIntersectExtent(v.feature,extent));
  spatialRuntime.lastQueryResults+=results.length;
  return results;
}


function setStatus(kind,status,label){
  state.load[kind]=status;
  const el={osm:els.osmStatus,address:els.addressStatus,cadastre:els.cadastreStatus,cavities:els.cavityStatus,cartofriches:els.cartofrichesStatus,heritage:els.heritageStatus,bss:els.bssStatus,elevation:els.elevationStatus}[kind];
  if(el){el.className=status==="ok"?"ok":status==="bad"?"bad":"pending";el.textContent=label}
  const core=["osm","address","cadastre","cavities","elevation"];
  const done=core.filter(k=>state.load[k]!=="pending").length;
  els.loadProgress.style.width=`${done/core.length*100}%`;
}

function cacheGet(key){
  try{
    const raw=localStorage.getItem(key); if(!raw)return null;
    const obj=JSON.parse(raw);
    if(Date.now()-obj.savedAt>CONFIG.cacheHours*3600e3){localStorage.removeItem(key);return null}
    return obj.value;
  }catch{return null}
}
function cacheSet(key,value){
  try{localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),value}))}catch{}
}

function expandExtentBox(e,factor=1.18){
  const cx=(e.west+e.east)/2,cy=(e.south+e.north)/2;
  const hw=(e.east-e.west)*factor/2,hh=(e.north-e.south)*factor/2;
  const bounds=largestExtent();
  return {
    west:Math.max(bounds.west,cx-hw),
    east:Math.min(bounds.east,cx+hw),
    south:Math.max(bounds.south,cy-hh),
    north:Math.min(bounds.north,cy+hh)
  };
}
function extentContains(outer,inner){
  return outer.west<=inner.west&&outer.east>=inner.east&&outer.south<=inner.south&&outer.north>=inner.north;
}
function osmCoverageHas(kind,e){
  const list=kind==="detail"?state.osmDetailCoverage:state.osmBaseCoverage;
  return list.some(c=>extentContains(c,e));
}
function osmCoverageAdd(kind,e){
  const list=kind==="detail"?state.osmDetailCoverage:state.osmBaseCoverage;
  list.push({...e});
  if(list.length>24)list.splice(0,list.length-24);
}
function osmExtentCacheKey(kind,e){
  const cx=((e.west+e.east)/2).toFixed(4),cy=((e.south+e.north)/2).toFixed(4);
  const w=(e.east-e.west).toFixed(4),h=(e.north-e.south).toFixed(4);
  return `atlas-karst-osm-v010d-${kind}-${cx}-${cy}-${w}-${h}`;
}
const OVERPASS_ENDPOINTS = [
  {id:"main",label:"FOSSGIS",url:"https://overpass-api.de/api/interpreter"},
  {id:"coffee",label:"Private.coffee",url:"https://overpass.private.coffee/api/interpreter"},
  {id:"vk",label:"VK Maps",url:"https://maps.mail.ru/osm/tools/overpass/api/interpreter"}
];
function overpassEndpointOrder(){
  // Private.coffee est placé en tête depuis file:// : le serveur principal exige plus
  // souvent un Referer identifiable, impossible à fabriquer depuis une page locale.
  return LOCAL_FILE_MODE
    ? [OVERPASS_ENDPOINTS[1],OVERPASS_ENDPOINTS[0],OVERPASS_ENDPOINTS[2]]
    : [...OVERPASS_ENDPOINTS];
}
function overpassBox(extent){
  return [extent.south,extent.west,extent.north,extent.east]
    .map(v=>Number(v).toFixed(7)).join(",");
}
function buildOverpassQuery(extent,kind="base"){
  const box=overpassBox(extent);
  if(kind==="detail"){
    return `[out:json][timeout:40][bbox:${box}];\nway["building"];\nout body geom(${box}) qt;`;
  }
  return `[out:json][timeout:45][bbox:${box}];
(
  way["highway"];
  way["waterway"];
  nwr["natural"~"^(water|wood|scrub|cliff|sinkhole|spring)$"];
  nwr["landuse"~"^(forest|meadow|farmland|residential|industrial|quarry|cemetery|orchard|vineyard|grass)$"];
  node["place"~"^(city|town|village|hamlet|locality)$"];
  node["natural"~"^(cave_entrance|spring|sinkhole)$"];
  node["man_made"~"^(adit|mineshaft)$"];
);
out body geom(${box}) qt;`;
}
function buildOverpassProbeQuery(center=state.center){
  const lat=Number(center.lat).toFixed(7),lon=Number(center.lon).toFixed(7);
  return `[out:json][timeout:12];\nnode(around:350,${lat},${lon})["place"];\nout tags center 1;`;
}
function osmFeatureKey(f){
  const first=f.coords?.[0],last=f.coords?.at?.(-1);
  return `${f.id}|${first?.[0]??""},${first?.[1]??""}|${last?.[0]??""},${last?.[1]??""}`;
}
function mergeOsmFeatures(features){
  const map=new Map((state.osm||[]).map(f=>[osmFeatureKey(f),f]));
  for(const f of features||[])map.set(osmFeatureKey(f),f);
  state.osm=[...map.values()];
  markMapDataRevision("osm");
  state.osmCavities=extractOsmCavities(state.osm);
  markSpatialIndexesDirty();
  refreshCavities();
}
function clearOsmCaches(){
  try{
    const doomed=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key?.startsWith("atlas-karst-osm-"))doomed.push(key);
    }
    doomed.forEach(key=>localStorage.removeItem(key));
  }catch{}
}
function conciseOverpassFailure(err){
  if(err?.name==="AbortError")return "délai dépassé";
  const msg=String(err?.message||err||"erreur inconnue").replace(/\s+/g," ").trim();
  if(err instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(msg))return "requête bloquée par le réseau ou CORS";
  return msg.slice(0,220);
}
function formatOsmElapsed(ms){
  const seconds=Math.max(0,Math.floor(ms/1000));
  return seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${String(seconds%60).padStart(2,"0")}s`;
}
let osmActivityTimer=0;
function updateOsmActivity(){
  if(!state.osmLoading||!state.osmActivityStarted)return;
  const elapsed=formatOsmElapsed(performance.now()-state.osmActivityStarted);
  const stage=state.osmAttemptLabel||"préparation";
  if(els.osmHelp)els.osmHelp.textContent=`OSM travaille · ${elapsed} · ${stage}. Le bouton de synchronisation permet d’annuler.`;
  setStatus("osm","pending",`${elapsed} · ${stage}`);
}
function cancelOsmSync(){
  if(!state.osmLoading)return false;
  state.osmAbortRequested=true;
  state.osmAttemptLabel="annulation…";
  state.osmAbortController?.abort();
  updateOsmActivity();
  return true;
}
async function overpassRequest(endpoint,query,method="POST",timeoutMs=50000,{trackAbort=false}={}){
  const controller=new AbortController();
  if(trackAbort)state.osmAbortController=controller;
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const options={
      method,
      signal:controller.signal,
      mode:"cors",
      credentials:"omit",
      cache:"no-store",
      headers:{Accept:"application/json"}
    };
    let url=endpoint;
    if(method==="POST"){
      options.body=new URLSearchParams({data:query});
    }else{
      url+=`${url.includes("?")?"&":"?"}data=${encodeURIComponent(query)}`;
    }
    const response=await fetch(url,options);
    const textBody=await response.text();
    if(!response.ok){
      const short=textBody.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,190);
      const retry=response.headers.get("retry-after");
      throw new Error(`HTTP ${response.status}${retry?` · réessayer dans ${retry}s`:""}${short?` · ${short}`:""}`);
    }
    let json;
    try{json=JSON.parse(textBody)}
    catch{throw new Error(`réponse non JSON${textBody?` · ${textBody.slice(0,100)}`:""}`)}
    if(!Array.isArray(json.elements))throw new Error("réponse Overpass incomplète");
    return json;
  }finally{
    clearTimeout(timer);
    if(trackAbort&&state.osmAbortController===controller)state.osmAbortController=null;
  }
}
async function queryOverpass(query,{probe=false,onAttempt=null}={}){
  const failures=[];
  for(const endpoint of overpassEndpointOrder()){
    const methods=query.length<1500?["POST","GET"]:["POST"];
    for(const method of methods){
      if(state.osmAbortRequested){const e=new Error("Synchronisation annulée");e.name="AbortError";throw e}
      try{
        onAttempt?.(endpoint,method);
        const json=await overpassRequest(endpoint.url,query,method,probe?16000:(method==="POST"?58000:42000),{trackAbort:!probe});
        return {json,endpoint:endpoint.url,endpointLabel:endpoint.label,method};
      }catch(err){
        if(state.osmAbortRequested){const e=new Error("Synchronisation annulée");e.name="AbortError";throw e}
        failures.push(`${endpoint.label} ${method} : ${conciseOverpassFailure(err)}`);
      }
    }
  }
  const error=new Error(failures.join(" | "));
  error.failures=failures;
  throw error;
}
async function loadOsmWindow(kind,extent,force=false){
  if(!force&&osmCoverageHas(kind,extent))return {cached:true,count:0};
  const cacheKey=osmExtentCacheKey(kind,extent);
  if(!force){
    const cached=cacheGet(cacheKey);
    if(cached?.data){
      mergeOsmFeatures(cached.data);
      osmCoverageAdd(kind,extent);
      return {cached:true,count:cached.data.length,endpoint:cached.meta?.endpoint};
    }
  }
  const query=buildOverpassQuery(extent,kind);
  const result=await queryOverpass(query,{onAttempt:(endpoint,method)=>{
    state.osmAttemptLabel=`${kind==="detail"?"bâtiments":"surface"} · ${endpoint.label} ${method}`;
    updateOsmActivity();
  }});
  const parsed=parseOsm(result.json);
  mergeOsmFeatures(parsed);
  osmCoverageAdd(kind,extent);
  cacheSet(cacheKey,{data:parsed,meta:{endpoint:result.endpoint,method:result.method,timestamp:result.json.osm3s?.timestamp_osm_base||null}});
  state.osmMeta={endpoint:result.endpoint,endpointLabel:result.endpointLabel,method:result.method,timestamp:result.json.osm3s?.timestamp_osm_base||null};
  return {cached:false,count:parsed.length,endpoint:result.endpoint};
}
async function ensureOsmForCurrentView(force=false){
  if((OFFLINE_TEST||!state.allowNetwork)&&!force)return;
  if(state.osmLoading){osmEnsurePending=true;return}
  const view=extentFor();
  const baseExtent=expandExtentBox(view,1.18);
  const needBase=force||!osmCoverageHas("base",view);
  const needDetail=state.zoomIndex>=3&&(force||!osmCoverageHas("detail",view));
  if(!needBase&&!needDetail)return;

  state.osmLoading=true;
  state.osmLastError="";
  state.osmParseStats={droppedPoints:0,droppedGeometries:0};
  state.osmAbortRequested=false;
  state.osmActivityStarted=performance.now();
  state.osmAttemptLabel=needBase?"préparation de la surface":"préparation du bâti";
  setStatus("osm","pending",needBase?"surface locale…":"bâti détaillé…");
  if(els.syncOsm){els.syncOsm.disabled=false;els.syncOsm.textContent="× annuler OSM"}
  clearInterval(osmActivityTimer);osmActivityTimer=setInterval(updateOsmActivity,1000);updateOsmActivity();
  try{
    let fromCache=0;
    if(needBase){
      state.osmAttemptLabel="recherche de la surface";updateOsmActivity();
      const r=await loadOsmWindow("base",baseExtent,force);
      if(r.cached)fromCache++;
      setStatus("osm","pending",`${state.osm?.length||0} objets · détails…`);
      render("osm-base-refresh");
    }
    if(needDetail){
      state.osmAttemptLabel="recherche des bâtiments";updateOsmActivity();
      const detailExtent=expandExtentBox(view,1.08);
      const r=await loadOsmWindow("detail",detailExtent,force);
      if(r.cached)fromCache++;
    }
    const host=state.osmMeta?.endpoint?new URL(state.osmMeta.endpoint).hostname:"cache local";
    const skipped=state.osmParseStats.droppedPoints;
    const parseNote=skipped?` ${skipped} sommet${skipped>1?"s":""} incomplet${skipped>1?"s":""} ignoré${skipped>1?"s":""} sans interrompre le chargement.`:"";
    setStatus("osm","ok",`${state.osm?.length||0} objets${fromCache?" · cache":""}${skipped?` · ${skipped} trous ignorés`:""}`);
    els.osmHelp.textContent=`Synchronisation réussie via ${host}${state.osmMeta?.method?` (${state.osmMeta.method})`:""}. Les géométries sont limitées à la fenêtre visible pour alléger la réponse.${parseNote}`;
    els.sourceNote.textContent=`Surface OSM chargée par fenêtres locales via ${host}. Les bâtiments ne sont demandés qu’aux zooms Site, Parcelle et Détail.${parseNote}`;
    render("osm-sync-complete");
    return true;
  }catch(err){
    const cancelled=err?.name==="AbortError"&&state.osmAbortRequested;
    state.osmLastError=err?.message||String(err);
    if(cancelled){
      if(state.osm?.length)setStatus("osm","ok",`${state.osm.length} objets · synchro annulée`);
      else setStatus("osm","pending","synchronisation annulée");
      els.osmHelp.textContent="Synchronisation OSM annulée. Les données déjà reçues restent disponibles.";
      render("osm-sync-cancelled");return false;
    }
    if(state.osm?.length)setStatus("osm","ok",`${state.osm.length} objets · mise à jour échouée`);
    else setStatus("osm","bad","échec OSM · diagnostic disponible");
    const nullOrigin=/bloquée par le réseau ou CORS|HTTP 403|HTTP 406/i.test(state.osmLastError);
    const localHint=LOCAL_FILE_MODE&&nullOrigin
      ? " Cette copie est ouverte en file:// : le navigateur n’envoie pas de Referer web et certains serveurs Overpass refusent désormais ces requêtes. Héberge le même fichier en HTTPS, ou utilise l’import JSON proposé juste au-dessus."
      : "";
    els.osmHelp.innerHTML=`<strong>Échec OSM.</strong> ${esc(state.osmLastError)}${esc(localHint)}`;
    els.sourceNote.innerHTML=`OSM n’a pas répondu pour cette fenêtre. ${esc(localHint||"Le diagnostic des serveurs permet de distinguer surcharge, refus HTTP et blocage CORS.")}`;
    console.warn("OSM indisponible",err);
    render("osm-sync-error");
    return false;
  }finally{
    clearInterval(osmActivityTimer);osmActivityTimer=0;
    state.osmLoading=false;state.osmActivityStarted=0;state.osmAbortController=null;state.osmAbortRequested=false;state.osmAttemptLabel="";
    if(els.syncOsm){els.syncOsm.disabled=false;els.syncOsm.textContent="↻ synchroniser OSM"}
    if(osmEnsurePending){osmEnsurePending=false;scheduleOsmEnsure(0)}
  }
}
let osmEnsureTimer=0,osmEnsurePending=false;
function scheduleOsmEnsure(delay=650){
  if(OFFLINE_TEST||!state.allowNetwork)return;
  if(state.osmLoading){osmEnsurePending=true;return}
  clearTimeout(osmEnsureTimer);
  osmEnsurePending=false;
  osmEnsureTimer=setTimeout(()=>{osmEnsureTimer=0;ensureOsmForCurrentView(false)},delay);
}
async function fetchOverpass(){
  if(!state.osmLegacyChecked){
    state.osmLegacyChecked=true;
    const legacy=cacheGet("atlas-karst-osm-v06");
    if(legacy?.data?.length){
      // L'ancien cache est conservé comme appoint, mais ne prétend plus couvrir toute
      // l'emprise : cette ancienne hypothèse empêchait toute vraie synchronisation.
      mergeOsmFeatures(legacy.data);
      state.osmMeta=legacy.meta||null;
      setStatus("osm","pending",`${state.osm.length} objets anciens · actualisation…`);
      render("osm-legacy-cache");
    }
  }
  return ensureOsmForCurrentView(false);
}
async function syncOsmNow(){
  if(state.osmLoading)return cancelOsmSync();
  state.allowNetwork=true;
  state.osmBaseCoverage=[];
  state.osmDetailCoverage=[];
  state.osmLastError="";
  clearOsmCaches();
  if(els.offlineNotice)els.offlineNotice.style.display="none";
  return ensureOsmForCurrentView(true);
}
async function testOsmServers(){
  if(state.osmLoading)return;
  state.allowNetwork=true;
  els.testOsm.disabled=true;
  setStatus("osm","pending","diagnostic…");
  const query=buildOverpassProbeQuery();
  const results=[];
  try{
    for(const endpoint of overpassEndpointOrder()){
      els.osmHelp.textContent=`Test de ${endpoint.label}…`;
      const started=performance.now();
      try{
        const json=await overpassRequest(endpoint.url,query,"POST",16000);
        results.push({ok:true,label:endpoint.label,ms:Math.round(performance.now()-started),count:json.elements.length});
      }catch(err){
        results.push({ok:false,label:endpoint.label,error:conciseOverpassFailure(err)});
      }
    }
    const successes=results.filter(r=>r.ok);
    const lines=results.map(r=>r.ok
      ? `<span><strong>${esc(r.label)}</strong> : OK · ${r.ms} ms · ${r.count} résultat${r.count>1?"s":""}</span>`
      : `<span><strong>${esc(r.label)}</strong> : ${esc(r.error)}</span>`).join("");
    els.osmHelp.innerHTML=`${lines}${LOCAL_FILE_MODE&&!successes.length?'<span><strong>Conclusion :</strong> blocage probablement lié à l’ouverture locale file://. Le même HTML hébergé en HTTPS fournira un Referer normal.</span>':""}`;
    setStatus("osm",successes.length?"ok":"bad",successes.length?`${successes.length}/${results.length} serveurs joignables`:"aucun serveur joignable");
  }finally{els.testOsm.disabled=false}
}
function openCurrentOverpassQuery(){
  const query=buildOverpassQuery(expandExtentBox(extentFor(),1.18),"base");
  const c=state.center;
  const url=`https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}&C=${encodeURIComponent(`${c.lat};${c.lon};14`)}&R`;
  const win=window.open(url,"_blank","noopener");
  if(!win)els.osmHelp.textContent="Le navigateur a bloqué l’ouverture d’Overpass Turbo. Autorise temporairement les fenêtres surgissantes pour cette page.";
  else els.osmHelp.textContent="La requête courante a été ouverte dans Overpass Turbo. Son onglet Export permet d’enregistrer les données brutes en JSON si la synchronisation directe est bloquée.";
}
async function importOsmJsonFile(file){
  if(!file)return;
  try{
    state.osmParseStats={droppedPoints:0,droppedGeometries:0};
    const json=JSON.parse(await file.text());
    if(!Array.isArray(json.elements))throw new Error("le fichier ne contient pas de tableau elements Overpass");
    const parsed=parseOsm(json);
    if(!parsed.length)throw new Error("aucune géométrie OSM exploitable");
    mergeOsmFeatures(parsed);
    const view=extentFor();
    osmCoverageAdd("base",view);
    if(parsed.some(f=>f.tags?.building))osmCoverageAdd("detail",view);
    state.osmMeta={endpoint:"import manuel",endpointLabel:"import JSON",method:"fichier",timestamp:json.osm3s?.timestamp_osm_base||null};
    setStatus("osm","ok",`${state.osm.length} objets · import JSON`);
    const skipped=state.osmParseStats.droppedPoints;
    els.osmHelp.textContent=`${parsed.length} géométries importées depuis ${file.name}.${skipped?` ${skipped} sommet${skipped>1?"s":""} incomplet${skipped>1?"s":""} ignoré${skipped>1?"s":""}.`:""} Elles seront incluses dans la prochaine sauvegarde ou copie autonome.`;
    render("osm-import");
  }catch(err){
    els.osmHelp.textContent=`Import OSM impossible : ${err?.message||"fichier invalide"}`;
  }finally{els.osmFile.value=""}
}

function osmCoordinateNumber(value){
  if(value===null||value===undefined||value==="")return NaN;
  const number=Number(value);
  return Number.isFinite(number)?number:NaN;
}
function osmGeometrySegments(rawGeometry,minPoints=2){
  if(!Array.isArray(rawGeometry))return [];
  const segments=[];
  let current=[];
  const flush=()=>{
    if(current.length>=minPoints)segments.push(current);
    else if(current.length)state.osmParseStats.droppedGeometries++;
    current=[];
  };
  for(const point of rawGeometry){
    const lon=osmCoordinateNumber(point?.lon),lat=osmCoordinateNumber(point?.lat);
    if(point&&Number.isFinite(lon)&&Number.isFinite(lat)){
      current.push([lon,lat]);
    }else{
      state.osmParseStats.droppedPoints++;
      flush();
    }
  }
  flush();
  return segments;
}
function geomFromElement(el){
  if(!el||typeof el!=="object"){
    state.osmParseStats.droppedGeometries++;
    return [];
  }
  if(Array.isArray(el.geometry)){
    const segments=osmGeometrySegments(el.geometry,2);
    if(segments.length)return segments;
  }
  if(Array.isArray(el.members)){
    const segments=[];
    for(const member of el.members){
      if(!member||!Array.isArray(member.geometry))continue;
      segments.push(...osmGeometrySegments(member.geometry,2));
    }
    if(segments.length)return segments;
  }
  const nodeLat=osmCoordinateNumber(el.lat),nodeLon=osmCoordinateNumber(el.lon);
  if(el.type==="node"&&Number.isFinite(nodeLat)&&Number.isFinite(nodeLon)){
    return [[[nodeLon,nodeLat]]];
  }
  const centerLat=osmCoordinateNumber(el.center?.lat),centerLon=osmCoordinateNumber(el.center?.lon);
  if(Number.isFinite(centerLat)&&Number.isFinite(centerLon)){
    return [[[centerLon,centerLat]]];
  }
  return [];
}
function parseOsm(json){
  const out=[];
  if(!json||!Array.isArray(json.elements))return out;
  for(const el of json.elements){
    const geoms=geomFromElement(el);
    for(const coords of geoms){
      if(!Array.isArray(coords)||!coords.length)continue;
      const validCoords=coords.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
      if(!validCoords.length)continue;
      const tags=el?.tags||{};
      const closed=validCoords.length>3&&validCoords[0][0]===validCoords.at(-1)[0]&&validCoords[0][1]===validCoords.at(-1)[1];
      const lons=validCoords.map(p=>p[0]),lats=validCoords.map(p=>p[1]);
      const bbox={west:Math.min(...lons),east:Math.max(...lons),south:Math.min(...lats),north:Math.max(...lats)};
      out.push({id:`${el?.type||"element"}/${el?.id||out.length}`,type:el?.type||"unknown",tags,coords:validCoords,closed,bbox});
    }
  }
  return out;
}


const OBSERVATION_KEY="atlas-karst-observations-v06";
function loadLocalCavities(){
  try{
    let v=JSON.parse(localStorage.getItem(OBSERVATION_KEY)||"null");
    if(!Array.isArray(v)){
      const legacy=JSON.parse(localStorage.getItem("atlas-karst-local-cavities-v05")||"[]");
      v=Array.isArray(legacy)?legacy.map(c=>({id:c.id||`OBS-${Date.now()}-${Math.random()}`,mode:"point",glyph:c.markerOverride||"?o",name:c.name||"Observation importée",lat:+c.lat,lon:+c.lon,confidence:"med",season:"",source:"Observation locale importée de la V0.5"})):[];
    }
    state.observations=v.filter(o=>Number.isFinite(+o.lat)&&Number.isFinite(+o.lon)).map(o=>({...o,lat:+o.lat,lon:+o.lon,local:true}));
  }catch{state.observations=[]}
  refreshLocalCavitiesFromObservations();
}
function refreshLocalCavitiesFromObservations(){
  state.localCavities=state.observations.filter(o=>o.mode==="point").map(o=>{
    const def=localMarkerDefinition(o.glyph||"?o");
    return {id:o.id,name:o.name||def.detail,type:def.type,detail:def.detail,markerOverride:o.glyph||"?o",lat:o.lat,lon:o.lon,source:"Observation locale enregistrée dans cet atlas",local:true,observation:o};
  });
}
function saveLocalCavities(){
  try{localStorage.setItem(OBSERVATION_KEY,JSON.stringify(state.observations))}catch{}
  refreshLocalCavitiesFromObservations();
}
function loadLoreItems(){
  try{
    const v=JSON.parse(localStorage.getItem(LORE_KEY)||"[]");
    state.loreItems=Array.isArray(v)?v.filter(o=>Number.isFinite(+o.lat)&&Number.isFinite(+o.lon)).map(o=>({...o,lat:+o.lat,lon:+o.lon,category:o.category||"anecdote"})):[];
  }catch{state.loreItems=[]}
}
function saveLoreItems(){
  try{localStorage.setItem(LORE_KEY,JSON.stringify(state.loreItems))}catch{}
}

function normalizeLooseText(v){
  if(v==null)return "";
  if(Array.isArray(v))return v.filter(Boolean).join(" · ");
  if(typeof v==="object")return Object.values(v).filter(Boolean).join(" · ");
  const s=String(v).trim();
  if((s.startsWith("[")||s.startsWith("{"))&&s.length<1000){
    try{return normalizeLooseText(JSON.parse(s.replaceAll("'",'"')))}catch{}
  }
  return s==="{}"||s==="[]"?"":s;
}
function isMetropolitanFranceCoordinate(lat,lon){
  return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=41&&lat<=51.6&&lon>=-6.2&&lon<=10.3;
}
function cartofrichesCoordinateCandidates(a,b,origin="coordonnées"){
  const out=[];
  const push=(lat,lon,label,swapped)=>{
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
    const distance=distanceMeters(CONFIG.dataCenter,{lat,lon});
    const inFrance=isMetropolitanFranceCoordinate(lat,lon);
    out.push({lat,lon,label,swapped,distance,inFrance});
  };
  // Hypothèse 1 : premier nombre = latitude, second = longitude.
  push(a,b,`${origin} · latitude/longitude`,false);
  // Hypothèse 2 : ordre géospatial classique longitude/latitude.
  push(b,a,`${origin} · longitude/latitude corrigé`,true);
  return out;
}
function chooseCartofrichesCoordinate(candidates,insee=""){
  if(!candidates.length)return null;
  const isCharente=String(insee||"").padStart(5,"0").startsWith("16");
  return candidates.slice().sort((a,b)=>{
    // Une coordonnée située en France métropolitaine est infiniment plus plausible
    // pour les codes INSEE métropolitains qu'un point valide mathématiquement,
    // mais posé à 5 000 km.
    const penaltyA=(a.inFrance?0:10_000_000)+(isCharente&&a.distance>250_000?5_000_000:0);
    const penaltyB=(b.inFrance?0:10_000_000)+(isCharente&&b.distance>250_000?5_000_000:0);
    return (penaltyA+a.distance)-(penaltyB+b.distance);
  })[0];
}
function parseWktPoint(value,insee=""){
  const s=normalizeLooseText(value);
  const m=s.match(/POINT(?:\s+Z|\s+ZM)?\s*\(\s*(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)(?:\s+-?\d+(?:[.,]\d+)?)?\s*\)/i);
  if(!m)return null;
  const a=Number(m[1].replace(",",".")),b=Number(m[2].replace(",","."));
  return chooseCartofrichesCoordinate(cartofrichesCoordinateCandidates(a,b,"geompoint WKT"),insee);
}
function parseWktSurfaceCentroid(value,insee=""){
  const s=normalizeLooseText(value);
  if(!/^(POLYGON|MULTIPOLYGON)/i.test(s))return null;
  const nums=[...s.matchAll(/(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)/g)]
    .slice(0,5000)
    .map(m=>[Number(m[1].replace(",",".")),Number(m[2].replace(",",".") )])
    .filter(p=>p.every(Number.isFinite));
  if(!nums.length)return null;
  const a=nums.reduce((sum,p)=>sum+p[0],0)/nums.length;
  const b=nums.reduce((sum,p)=>sum+p[1],0)/nums.length;
  return chooseCartofrichesCoordinate(cartofrichesCoordinateCandidates(a,b,"centroïde geomsurf"),insee);
}
function cartofrichesCoordinates(r){
  const insee=normalizeLooseText(r.comm_insee??r.code_insee);
  const rawLat=String(r.lat??r.latitude??r.LAT??"").trim();
  const rawLon=String(r.long??r.lon??r.longitude??r.LONG??"").trim();
  const explicitLat=Number(rawLat.replace(",","."));
  const explicitLon=Number(rawLon.replace(",","."));

  if(rawLat!==""&&rawLon!==""&&Number.isFinite(explicitLat)&&Number.isFinite(explicitLon)){
    const chosen=chooseCartofrichesCoordinate(
      cartofrichesCoordinateCandidates(explicitLat,explicitLon,"colonnes lat/long"),
      insee
    );
    if(chosen)return {
      ...chosen,
      coordinateSource:chosen.label,
      coordinateSwapped:chosen.swapped
    };
  }

  const point=parseWktPoint(r.geompoint??r.geom_point??r.geometry??r.geometrie,insee);
  if(point)return {
    ...point,
    coordinateSource:point.label,
    coordinateSwapped:point.swapped
  };

  const surface=parseWktSurfaceCentroid(r.geomsurf??r.geom_surf??r.surface_geom??r.geometry,insee);
  if(surface)return {
    ...surface,
    coordinateSource:surface.label,
    coordinateSwapped:surface.swapped
  };

  return null;
}

function normalizeCartofrichesRow(r){
  const coord=cartofrichesCoordinates(r);
  if(!coord)return null;
  const {lat,lon}=coord;
  return {
    id:normalizeLooseText(r.site_id??r.id??r.fid)||`CF-${lat}-${lon}`,
    name:normalizeLooseText(r.site_nom??r.nom_site??r.nom)||"Site Cartofriches sans nom",
    type:normalizeLooseText(r.site_type??r.type_site??r.type)||"inconnu",
    status:normalizeLooseText(r.site_statut??r.statut_site??r.statut)||"inconnu",
    address:normalizeLooseText(r.site_adresse??r.adresse),
    surface:Number(r.site_surface??r.unite_fonciere_surface??r.surface),
    occupation:normalizeLooseText(r.site_occupation??r.occupation),
    activity:normalizeLooseText(r.activite_libelle??r.activite),
    activityEnd:normalizeLooseText(r.activite_fin_annee??r.annee_fin),
    updated:normalizeLooseText(r.site_actu_date??r.date_maj),
    identified:normalizeLooseText(r.site_identif_date??r.date_identification),
    commune:normalizeLooseText(r.comm_nom??r.commune),
    insee:normalizeLooseText(r.comm_insee??r.code_insee),
    producer:normalizeLooseText(r.nom_prodcartofriches??r.source_producteur??r.source_nom??r.producteur),
    sourceNature:normalizeLooseText(r.source_nature),
    url:normalizeLooseText(r.site_url),
    security:normalizeLooseText(r.site_securite),
    pollution:normalizeLooseText(r.sol_pollution_existe??r.bati_pollution??r.pollution_statut??r.site_pollution??r.pollution),
    coordinateSource:coord.coordinateSource||coord.label||"",
    coordinateSwapped:!!coord.coordinateSwapped,
    lat,lon,
    raw:r
  };
}
function cartofrichesMarker(f){
  const t=(f.type||"").toLowerCase();
  let glyph="F?";
  if(t.includes("industri"))glyph="Fi";
  else if(t.includes("commerc"))glyph="Fc";
  else if(t.includes("habitat")||t.includes("résident"))glyph="Fh";
  else if(t.includes("tertiaire")||t.includes("bureau"))glyph="Ft";
  else if(t.includes("équipement")||t.includes("service public"))glyph="Fe";
  else if(t.includes("ferro")||t.includes("sncf"))glyph="Ff";
  else if(t.includes("militaire"))glyph="Fm";
  const s=(f.status||"").toLowerCase();
  let cls="c-carto-unknown",label="statut inconnu";
  if(s.includes("reconvert")){cls="c-carto-reconverted";label="site reconverti"}
  else if(s.includes("avec projet")){cls="c-carto-project";label="friche avec projet"}
  else if(s.includes("sans projet")){cls="c-carto-active";label="friche sans projet"}
  else if(s.includes("potentielle")){cls="c-carto-potential";label="friche potentielle"}
  return {glyph,cls,label};
}
function saveCartofriches(){
  try{
    localStorage.setItem(CARTOFRICHES_KEY,JSON.stringify({
      savedAt:Date.now(),
      items:state.cartofriches,
      includeReconverted:state.cartofrichesIncludeReconverted
    }));
  }catch{}
}
function loadCartofriches(){
  try{
    const v=JSON.parse(localStorage.getItem(CARTOFRICHES_KEY)||"null");
    if(v&&Array.isArray(v.items)){
      state.cartofriches=v.items.map(normalizeCartofrichesRow).filter(Boolean);
      state.cartofrichesIncludeReconverted=!!v.includeReconverted;
    }
  }catch{state.cartofriches=[]}
  updateCartofrichesUI();
}
function updateCartofrichesUI(message=""){
  if(!els.cartofrichesCount)return;
  const visible=state.cartofriches.filter(f=>state.cartofrichesIncludeReconverted||!f.status.toLowerCase().includes("reconvert"));
  els.cartofrichesCount.textContent=visible.length;
  els.cartofrichesReconverted.checked=state.cartofrichesIncludeReconverted;
  const communes=[...new Set(visible.map(f=>f.commune).filter(Boolean))];
  els.cartofrichesSummary.textContent=message||(visible.length
    ? `${communes.length} commune${communes.length>1?"s":""} · source mémorisée dans ce navigateur`
    : "Aucune donnée locale chargée.");
  if(els.cartofrichesStatus){
    els.cartofrichesStatus.textContent=visible.length?`${visible.length} sites`:"à charger";
    els.cartofrichesStatus.className=visible.length?"ok":"pending";
  }
}
function cartofrichesQueryExtent(){
  const e=largestExtent();
  return {west:e.west,east:e.east,south:e.south,north:e.north};
}
async function syncCartofriches(){
  const e=cartofrichesQueryExtent();
  els.cartofrichesHelp.textContent="Connexion à l’API tabulaire officielle…";
  els.syncCartofriches.disabled=true;
  try{
    let page=1,all=[],total=Infinity;
    while(all.length<total&&page<=20){
      const q=new URLSearchParams({
        page:String(page),page_size:"50",
        long__greater:String(e.west),long__less:String(e.east),
        lat__greater:String(e.south),lat__less:String(e.north)
      });
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),20000);
      const r=await fetch(`${CARTOFRICHES_API}?${q}`,{signal:controller.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      const rows=Array.isArray(j.data)?j.data:[];
      all.push(...rows);
      total=Number(j.meta?.total??all.length);
      if(!rows.length)break;
      page++;
    }
    state.cartofriches=all.map(normalizeCartofrichesRow).filter(Boolean);
    saveCartofriches();updateCartofrichesUI(`Synchronisé depuis data.gouv.fr · ${state.cartofriches.length} lignes locales`);
    els.cartofrichesHelp.innerHTML=`Synchronisation terminée. Les données sont désormais conservées localement et la carte reste utilisable hors ligne.`;
    render();
  }catch(err){
    console.warn("Cartofriches API indisponible",err);
    els.cartofrichesHelp.innerHTML=`L’API n’a pas répondu (${esc(err?.message||"erreur réseau")}). Utilise <strong>télécharger le CSV</strong>, puis <strong>importer le CSV</strong> : cette voie ne dépend pas de CORS.`;
    updateCartofrichesUI();
  }finally{els.syncCartofriches.disabled=false}
}
function detectDelimiter(line){
  let commas=0,semis=0,tabs=0,quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"')quoted=!quoted;
    else if(!quoted&&ch===",")commas++;
    else if(!quoted&&ch===";")semis++;
    else if(!quoted&&ch==="\t")tabs++;
  }
  return semis>=commas&&semis>=tabs?";":tabs>commas?"\t":",";
}
function parseCartofrichesCsv(textData){
  const firstBreak=textData.search(/\r?\n/);
  const delimiter=detectDelimiter(textData.slice(0,firstBreak<0?textData.length:firstBreak));
  let row=[],cell="",quoted=false,headers=null,items=[];
  const e=cartofrichesQueryExtent();
  const stats={
    delimiter:delimiter==="\t"?"tabulation":delimiter,
    rows:0,
    geolocated:0,
    inside:0,
    charente:0,
    commune:0,
    nearest:null,
    swapped:0,
    coordinateSources:{},
    headers:[]
  };
  const finishCell=()=>{row.push(cell);cell=""};
  const finishRow=()=>{
    if(!headers){
      headers=row.map(v=>v.replace(/^\uFEFF/,"").trim());
      stats.headers=headers;
    }else if(row.some(v=>String(v).trim()!=="")){
      stats.rows++;
      const obj={};headers.forEach((h,i)=>obj[h]=row[i]??"");
      const normalized=normalizeCartofrichesRow(obj);
      if(normalized){
        stats.geolocated++;
        if(normalized.coordinateSwapped)stats.swapped++;
        stats.coordinateSources[normalized.coordinateSource]=(stats.coordinateSources[normalized.coordinateSource]||0)+1;
        if(normalized.insee==="16418")stats.commune++;
        if(String(normalized.insee).startsWith("16"))stats.charente++;
        const d=distanceMeters(CONFIG.dataCenter,normalized);
        if(!stats.nearest||d<stats.nearest.distance)stats.nearest={distance:d,item:normalized};
        if(inExtent(normalized.lat,normalized.lon,e)){
          stats.inside++;
          items.push(normalized);
        }
      }
    }
    row=[];
  };
  for(let i=0;i<textData.length;i++){
    const ch=textData[i];
    if(quoted){
      if(ch==='"'&&textData[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===delimiter)finishCell();
      else if(ch==="\n"){finishCell();finishRow()}
      else if(ch!=="\r")cell+=ch;
    }
  }
  if(cell.length||row.length){finishCell();finishRow()}
  return {items,stats};
}
async function importCartofrichesFile(file){
  if(!file)return;
  els.cartofrichesHelp.textContent=`Lecture de ${file.name}…`;
  try{
    const txt=await file.text();
    const result=parseCartofrichesCsv(txt),items=result.items,stats=result.stats;
    if(stats.rows>0&&stats.geolocated===0){
      throw new Error(`aucune coordonnée reconnue parmi ${stats.rows.toLocaleString("fr-FR")} lignes · colonnes vues : ${stats.headers.slice(0,12).join(", ")}`);
    }
    state.cartofriches=items;
    saveCartofriches();
    updateCartofrichesUI(`Import CSV · ${stats.inside} dans l’emprise · ${stats.geolocated.toLocaleString("fr-FR")} géolocalisées`);
    if(items.length){
      const communes=[...new Set(items.map(v=>v.commune).filter(Boolean))];
      els.cartofrichesHelp.innerHTML=
        `<strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues · `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées · `+
        `<strong>${stats.swapped.toLocaleString("fr-FR")}</strong> orientations corrigées · `+
        `<strong>${items.length}</strong> dans l’emprise de l’Atlas`+
        `${communes.length?` · communes : ${esc(communes.join(", "))}`:""}. `+
        `Le fichier national n’est pas conservé, seul l’extrait local est mémorisé.`;
    }else{
      const nearest=stats.nearest;
      const nearestText=nearest
        ? ` Le site le plus proche est <strong>${esc(nearest.item.name)}</strong>${nearest.item.commune?` à ${esc(nearest.item.commune)}`:""}, à environ <strong>${(nearest.distance/1000).toFixed(1)} km</strong> `+
          `(${nearest.item.lat.toFixed(5)}, ${nearest.item.lon.toFixed(5)} · ${esc(nearest.item.coordinateSource||"coordonnées non précisées")}).`
        : "";
      els.cartofrichesHelp.innerHTML=
        `Le fichier est bien compris : <strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues, `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées, `+
        `<strong>${stats.charente}</strong> en Charente, <strong>${stats.swapped.toLocaleString("fr-FR")}</strong> orientations corrigées, mais aucune dans l’emprise actuelle de ${CONFIG.dataWidthKm} × ${CONFIG.dataHeightKm} km.`+
        nearestText;
    }
    render();
  }catch(err){
    els.cartofrichesHelp.textContent=`Import impossible : ${err?.message||"format non reconnu"}`;
  }finally{els.cartofrichesFile.value=""}
}

function heritageField(fields,patterns,fallback=""){
  const entries=Object.entries(fields||{});
  for(const pattern of patterns){
    const re=pattern instanceof RegExp?pattern:new RegExp(pattern,"i");
    const found=entries.find(([k,v])=>v!=null&&String(v).trim()!==""&&re.test(k));
    if(found)return normalizeLooseText(found[1]);
  }
  return fallback;
}
function heritageCoordinates(record){
  const geometry=record?.geometry;
  if(geometry?.type==="Point"&&Array.isArray(geometry.coordinates)){
    const [lon,lat]=geometry.coordinates.map(Number);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
  }
  const f=record?.fields||record||{};
  const entries=Object.entries(f);
  const latitudeEntry=entries.find(([k,v])=>v!=null&&/(^|_)(lat|latitude)($|_)/i.test(k));
  const longitudeEntry=entries.find(([k,v])=>v!=null&&/(^|_)(lon|lng|longitude)($|_)/i.test(k));
  if(latitudeEntry&&longitudeEntry){
    const lat=Number(String(latitudeEntry[1]).replace(",","."));
    const lon=Number(String(longitudeEntry[1]).replace(",","."));
    if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)return {lat,lon};
  }
  const named=[f.coordonnees_au_format_wgs84,f.coordonnees_finales,f.coordonnees_geographiques,f.coordonnees,f.geolocalisation,f.geo_point_2d,f.localisation,f.location,record?._atlasGeo];
  const candidates=[...named,...entries.map(([,v])=>v).filter(v=>v&&typeof v==="object")];
  for(const raw of candidates){
    if(raw&&typeof raw==="object"){
      if(raw.type==="Point"&&Array.isArray(raw.coordinates)){
        const [lon,lat]=raw.coordinates.map(Number);
        if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
      }
      const lat=Number(raw.lat??raw.latitude??raw[1]),lon=Number(raw.lon??raw.lng??raw.longitude??raw[0]);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }
    const textValue=normalizeLooseText(raw);
    const nums=(textValue.match(/-?\d+(?:[.,]\d+)?/g)||[]).slice(0,2).map(v=>Number(v.replace(",",".")));
    if(nums.length===2){
      const chosen=chooseCartofrichesCoordinate(cartofrichesCoordinateCandidates(nums[0],nums[1],"coordonnées patrimoniales"),"");
      if(chosen)return {lat:chosen.lat,lon:chosen.lon};
    }
  }
  return null;
}
function heritageMarkerDefinition(category){
  if(category==="wikipedia")return {glyph:"WI",cls:"c-heritage-wikipedia",label:"curiosité documentée par Wikipédia"};
  return CULTURE_DATASETS[category]||{glyph:"PA",cls:"c-heritage-monument",label:"lieu patrimonial"};
}
function normalizeCultureRecord(record,category){
  const coord=heritageCoordinates(record);if(!coord)return null;
  const f=record.fields||record;
  const ref=heritageField(f,[/^reference$/i,/^ref$/i,/identifiant.*origine/i,/identifiant/i],record.recordid||"");
  const name=heritageField(f,[/titre.*courant/i,/denomination.*edifice/i,/nom.*officiel/i,/^nomoff$/i,/^nom$/i,/appellation/i,/intitule/i],CULTURE_DATASETS[category]?.label||"Lieu patrimonial");
  const commune=heritageField(f,[/commune.*editoriale/i,/commune.*index/i,/^commune$/i,/^com$/i,/^ville/i]);
  const address=heritageField(f,[/adresse.*editoriale/i,/adresse.*index/i,/^adresse$/i,/^adrs/i]);
  const period=heritageField(f,[/siecle.*principal/i,/format.*siecle/i,/^scle/i,/datation/i,/annee.*creation/i]);
  const protection=heritageField(f,[/nature.*protection/i,/date.*typologie.*protection/i,/precision.*protection/i,/^ppro/i,/protection/i]);
  const description=heritageField(f,[/historique/i,/description.*edifice/i,/^description$/i,/^hist$/i,/atout/i,/interet/i,/presentation/i]);
  let url=heritageField(f,[/liens.*externes/i,/url/i,/lien.*pop/i]);
  if(category==="monument"&&ref&&!/^https?:/i.test(url))url=`https://pop.culture.gouv.fr/notice/merimee/${encodeURIComponent(ref)}`;
  const d=heritageMarkerDefinition(category);
  return {id:`CULTURE-${category}-${ref||record.recordid||record._atlasRecordId||coord.lat+":"+coord.lon}`,category,name,lat:coord.lat,lon:coord.lon,ref,commune,address,period,protection,description:description.slice(0,1200),url,source:`Ministère de la Culture · ${d.label}`,license:"Licence Ouverte 2.0",official:true,heritage:true,dataset:record._atlasDataset||"",apiVersion:record._atlasApiVersion||"2.1",syncedAt:record._atlasSyncedAt||new Date().toISOString()};
}
function normalizeHeritageItem(item){
  if(!item||!Number.isFinite(+item.lat)||!Number.isFinite(+item.lon))return null;
  return {...item,lat:+item.lat,lon:+item.lon,category:item.category||"wikipedia",heritage:true};
}
function heritageFingerprint(item){return `${item.category||""}|${String(item.id||item.name||"").toLowerCase()}`}
function mergeHeritageItems(items){
  const map=new Map((state.heritageItems||[]).map(v=>[heritageFingerprint(v),v]));
  for(const raw of items||[]){const item=normalizeHeritageItem(raw);if(item)map.set(heritageFingerprint(item),item)}
  const all=[...map.values()];
  // Fusionne les pages Wikipédia avec une notice officielle très proche plutôt que d'empiler deux symboles.
  const culture=all.filter(v=>v.category!=="wikipedia"),wiki=all.filter(v=>v.category==="wikipedia"),kept=[...culture];
  for(const w of wiki){
    const near=culture.find(c=>distanceMeters(c,w)<75&&(String(c.name).toLowerCase().includes(String(w.name).toLowerCase())||String(w.name).toLowerCase().includes(String(c.name).toLowerCase())||distanceMeters(c,w)<25));
    if(near){near.wikipediaDescription=near.wikipediaDescription||w.description;near.wikipediaUrl=near.wikipediaUrl||w.url;near.wikidata=near.wikidata||w.wikidata}
    else kept.push(w);
  }
  state.heritageItems=kept.sort((a,b)=>String(a.name).localeCompare(String(b.name),"fr"));
  saveHeritage();updateHeritageUI();render();
}
function saveHeritage(){
  try{localStorage.setItem(HERITAGE_KEY,JSON.stringify({items:state.heritageItems,enabled:state.heritageEnabled,updatedAt:new Date().toISOString()}))}catch{}
}
function loadHeritage(){
  try{
    const saved=JSON.parse(localStorage.getItem(HERITAGE_KEY)||"null");
    if(saved&&Array.isArray(saved.items))state.heritageItems=saved.items.map(normalizeHeritageItem).filter(Boolean);
    if(saved?.enabled)state.heritageEnabled={...state.heritageEnabled,...saved.enabled};
  }catch{state.heritageItems=[]}
  updateHeritageUI();
}
function enabledHeritageItems(){return state.heritageItems.filter(v=>state.heritageEnabled[v.category]!==false)}
function updateHeritageUI(message=""){
  if(!els.heritageCount)return;
  const visible=enabledHeritageItems();els.heritageCount.textContent=visible.length;
  const sourceCounts=visible.reduce((acc,v)=>(acc[v.category]=(acc[v.category]||0)+1,acc),{});
  const pills=Object.entries(sourceCounts).map(([k,n])=>`${heritageMarkerDefinition(k).glyph} ${n}`).join(" · ");
  els.heritageSummary.textContent=message||(visible.length?`${pills} · mémorisés dans ce navigateur`:"Aucune source patrimoniale synchronisée.");
  const bindings={heritageMonuments:"monument",heritageGardens:"garden",heritageHomes:"house",heritageMuseums:"museum",heritageWikipedia:"wikipedia"};
  for(const [id,key] of Object.entries(bindings))if(els[id])els[id].checked=state.heritageEnabled[key]!==false;
  setStatus("heritage",visible.length?"ok":"pending",visible.length?`${visible.length} lieux`:"à synchroniser");
}
function heritageQueryRadius(){
  const e=largestExtent(),c=CONFIG.dataCenter;
  return Math.min(10000,Math.ceil(Math.max(distanceMeters(c,{lat:e.north,lon:e.west}),distanceMeters(c,{lat:e.south,lon:e.east}))+500));
}
function cultureFieldToken(name){
  const value=String(name||"");
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)?value:`\`${value.replaceAll("`","``")}\``;
}
function cultureKey(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
function cultureFieldScore(field,hints=[]){
  const hay=cultureKey(`${field?.name||""} ${field?.label||""}`);
  const isGeo=field?.type==="geo_point_2d"||field?.type==="geo_shape";
  if(!isGeo)return 0;
  let score=field.type==="geo_point_2d"?100:85;
  for(const [index,hint] of hints.entries())if(hay.includes(cultureKey(hint)))score+=40-index;
  if(/coord|geo|wgs|localisation/.test(hay))score+=8;
  return score;
}
function cultureFindGeoField(metadata,ds){
  const fields=metadata?.fields||[];
  const candidates=fields
    .map(field=>({field,score:cultureFieldScore(field,ds.geoHints||[])}))
    .filter(v=>v.score>0)
    .sort((a,b)=>b.score-a.score);
  return candidates[0]?.field||null;
}
function cultureFindDepartmentField(metadata){
  const candidates=(metadata?.fields||[]).map(field=>{
    const hay=cultureKey(`${field.name||""} ${field.label||""}`);
    let score=0;
    if(/code.*departement|departement.*code|dpt.*num|dep.*num/.test(hay))score=100;
    else if(/departement.*format.*numerique|^dpt$|^dep$/.test(hay))score=90;
    else if(/departement/.test(hay))score=60;
    return {field,score,hay};
  }).filter(v=>v.score).sort((a,b)=>b.score-a.score);
  return candidates[0]||null;
}
function cultureApiErrorMessage(response,body){
  let detail="";
  try{
    const parsed=JSON.parse(body);
    detail=parsed.message||parsed.error||parsed.error_code||"";
  }catch{detail=String(body||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
  return `HTTP ${response.status}${detail?` · ${detail.slice(0,260)}`:""}`;
}
async function cultureFetchJson(dataset,path="",params=null,timeoutMs=32000){
  const failures=[];
  for(const portal of CULTURE_API_PORTALS){
    const base=`${portal}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(dataset)}${path}`;
    const url=params?`${base}?${params}`:base;
    try{
      const response=await fetchWithTimeout(url,{mode:"cors",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}},timeoutMs);
      const body=await response.text();
      if(!response.ok)throw new Error(cultureApiErrorMessage(response,body));
      let json;
      try{json=JSON.parse(body)}catch{throw new Error("réponse JSON illisible")}
      return {json,portal,url};
    }catch(err){
      const message=err?.name==="AbortError"?"délai dépassé":err?.message||String(err);
      failures.push(`${new URL(portal).hostname}: ${message}`);
    }
  }
  throw new Error(failures.join(" | "));
}
async function cultureFetchMetadata(dataset){
  const {json,portal}=await cultureFetchJson(dataset,"",null,26000);
  return {...json,_atlasPortal:portal};
}

// L’API Explore v2.1 répond correctement depuis une page HTTPS, mais certains
// portails refusent l’origine opaque « null » d’un fichier ouvert en file://.
// L’API Search v1 conserve un mode JSONP officiel : un <script> externe n’est
// pas soumis à CORS et permet donc à l’Atlas portable de synchroniser Culture.
function cultureJsonp(url,timeoutMs=42000){
  return new Promise((resolve,reject)=>{
    const callback=`__atlasCulture_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement("script");
    let settled=false;
    const cleanup=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      script.remove();
      try{delete window[callback]}catch{window[callback]=undefined}
    };
    window[callback]=payload=>{cleanup();resolve(payload)};
    script.async=true;
    script.referrerPolicy="no-referrer";
    script.onerror=()=>{cleanup();reject(new Error("chargement JSONP refusé ou indisponible"))};
    const separator=url.includes("?")?"&":"?";
    script.src=`${url}${separator}format=jsonp&callback=${encodeURIComponent(callback)}`;
    const timer=setTimeout(()=>{cleanup();reject(new DOMException("Délai JSONP dépassé","AbortError"))},timeoutMs);
    document.head.appendChild(script);
  });
}

async function cultureFetchV1JsonpPage(portal,dataset,params,timeoutMs=42000){
  const query=new URLSearchParams(params||{});
  query.set("dataset",dataset);
  const url=`${portal}/api/records/1.0/search/?${query}`;
  const json=await cultureJsonp(url,timeoutMs);
  if(json?.error)throw new Error(json.error?.message||json.error||"erreur API JSONP");
  if(!Array.isArray(json?.records))throw new Error("réponse JSONP sans enregistrements");
  return {json,portal,url};
}

async function cultureFetchV1JsonpPages(dataset,params,maxRecords=1000){
  const failures=[];
  for(const portal of CULTURE_API_PORTALS){
    try{
      const out=[];
      let start=0,nhits=Infinity;
      while(start<nhits&&out.length<maxRecords){
        const pageSize=Math.min(500,maxRecords-out.length);
        const pageParams={...(params||{}),rows:String(pageSize),start:String(start)};
        const result=await cultureFetchV1JsonpPage(portal,dataset,pageParams);
        const rows=result.json.records||[];
        nhits=Number(result.json.nhits??rows.length);
        out.push(...rows);
        if(!rows.length||rows.length<pageSize)break;
        start+=rows.length;
      }
      return {rows:out,total:Number.isFinite(nhits)?nhits:out.length,portal};
    }catch(err){
      const message=err?.name==="AbortError"?"délai dépassé":err?.message||String(err);
      failures.push(`${new URL(portal).hostname}: ${message}`);
    }
  }
  throw new Error(failures.join(" | "));
}

async function fetchCultureFromDatasetJsonp(dataset,category,ds){
  const radius=heritageQueryRadius();
  const attempts=[
    {label:"proximité JSONP",params:{"geofilter.distance":`${CONFIG.dataCenter.lat},${CONFIG.dataCenter.lon},${radius}`},cap:1000},
    // Le filtre plein texte sert de repli aux catalogues dont le champ spatial
    // n’est pas déclaré comme géographique par le portail.
    {label:"Charente JSONP",params:{q:"Charente"},cap:Math.min(ds.fullScanCap||1800,3000)}
  ];
  if(ds.allowFullScan)attempts.push({label:"catalogue JSONP complet",params:{},cap:ds.fullScanCap||1800});
  const errors=[];
  for(const attempt of attempts){
    try{
      const fetched=await cultureFetchV1JsonpPages(dataset,attempt.params,attempt.cap);
      const syncedAt=new Date().toISOString();
      const items=fetched.rows.map((raw,index)=>normalizeCultureRecord({
        ...raw,
        _atlasDataset:dataset,
        _atlasApiVersion:"1.0 JSONP",
        _atlasSyncedAt:syncedAt,
        _atlasRecordId:raw.recordid||`${dataset}-${index}`
      },category)).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
      // Une recherche départementale peut légitimement renvoyer des éléments
      // hors fenêtre. On accepte la tentative si elle a reçu des lignes, même
      // si le filtre local n’en conserve aucune.
      if(fetched.rows.length||attempt.label.includes("proximité")){
        return {items,dataset,strategy:attempt.label,portal:fetched.portal,total:fetched.total,received:fetched.rows.length};
      }
    }catch(err){errors.push(`${attempt.label}: ${err?.message||err}`)}
  }
  throw new Error(errors.join(" · "));
}
function tabularHeaderList(profile){
  const raw=profile?.profile?.header??profile?.header??profile?.profile?.columns??profile?.columns??[];
  if(!Array.isArray(raw))return [];
  return raw.map(value=>typeof value==="string"?value:(value?.name??value?.label??"")).filter(Boolean);
}
function cultureDepartmentHeader(headers){
  const scored=headers.map(name=>{
    const key=cultureKey(name);let score=0;
    if(key==="departement_format_numerique")score=120;
    else if(key==="code_insee_departement")score=115;
    else if(key==="dpt")score=110;
    else if(key==="departement")score=100;
    else if(key.includes("departement")&&key.includes("code"))score=105;
    else if(key.includes("departement"))score=85;
    if(key.includes("region"))score-=60;
    return {name,key,score};
  }).filter(v=>v.score>0).sort((a,b)=>b.score-a.score);
  return scored[0]||null;
}
async function cultureTabularJson(rid,path,params=null,timeoutMs=32000){
  const query=params instanceof URLSearchParams?params:new URLSearchParams(params||{});
  const url=`${DATAGOUV_TABULAR_BASE}/${encodeURIComponent(rid)}/${path}${query.size?`?${query}`:""}`;
  const response=await fetchWithTimeout(url,{headers:{Accept:"application/json"}},timeoutMs);
  const body=await response.text();
  let json=null;try{json=body?JSON.parse(body):null}catch{}
  if(!response.ok){
    const detail=json?.detail||json?.message||body.slice(0,240)||`HTTP ${response.status}`;
    throw new Error(`data.gouv tabulaire · HTTP ${response.status} · ${detail}`);
  }
  return {json,url};
}
async function cultureTabularProfile(rid){
  return (await cultureTabularJson(rid,"profile/",null,30000)).json;
}
async function cultureTabularPages(rid,baseParams,maxRecords=1800){
  const out=[];let page=1;
  while(out.length<maxRecords){
    const params=new URLSearchParams(baseParams||{});
    params.set("page",String(page));
    params.set("page_size",String(Math.min(50,maxRecords-out.length)));
    const {json}=await cultureTabularJson(rid,"data/",params,36000);
    const rows=Array.isArray(json?.data)?json.data:(Array.isArray(json?.results)?json.results:[]);
    out.push(...rows);
    if(!rows.length||rows.length<Number(params.get("page_size")))break;
    page+=1;
  }
  return out;
}
async function fetchCultureFromDataGouv(category){
  const source=CULTURE_TABULAR_RESOURCES[category];
  const ds=CULTURE_DATASETS[category];
  if(!source||!ds)throw new Error("ressource data.gouv absente");
  const profile=await cultureTabularProfile(source.rid);
  const headers=tabularHeaderList(profile);
  const department=cultureDepartmentHeader(headers);
  const errors=[];let rows=[];let strategy="";

  if(department){
    const values=/code|numerique|^dpt$/.test(department.key)?["16","016","Charente"]:["Charente","16","016"];
    for(const value of values){
      try{
        rows=await cultureTabularPages(source.rid,{[`${department.name}__exact`]:value},Math.min(ds.fullScanCap||2200,3500));
        if(rows.length){strategy=`API tabulaire data.gouv · ${department.name}=${value}`;break}
      }catch(err){errors.push(`${department.name}=${value}: ${err?.message||err}`)}
    }
  }

  // Les catalogues de labels et Muséofile restent assez petits pour un
  // parcours complet. On évite en revanche de télécharger les ~100 Mo de
  // Mérimée si le filtre départemental n’est pas disponible.
  if(!rows.length&&category!=="monument"){
    try{
      rows=await cultureTabularPages(source.rid,{},ds.fullScanCap||3500);
      strategy="API tabulaire data.gouv · catalogue filtré localement";
    }catch(err){errors.push(`catalogue complet: ${err?.message||err}`)}
  }
  if(!rows.length)throw new Error(errors.join(" · ")||"aucune ligne reçue par l’API tabulaire data.gouv");

  const syncedAt=new Date().toISOString();
  const items=rows.map((raw,index)=>normalizeCultureRecord({
    ...raw,
    _atlasDataset:source.dataset,
    _atlasApiVersion:"data.gouv tabulaire",
    _atlasSyncedAt:syncedAt,
    _atlasRecordId:raw.__id||raw.recordid||raw.id||`${source.dataset}-${index}`
  },category)).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
  return {items,dataset:source.dataset,strategy,portal:"tabular-api.data.gouv.fr",total:rows.length,received:rows.length};
}

async function cultureFetchPages(dataset,baseParams,maxRecords=600){
  const out=[];let offset=0,total=Infinity,portal="";
  while(offset<total&&out.length<maxRecords){
    const params=new URLSearchParams(baseParams||{});
    params.set("limit",String(Math.min(100,maxRecords-out.length)));
    params.set("offset",String(offset));
    const result=await cultureFetchJson(dataset,"/records",params,36000);
    portal=result.portal;
    const rows=Array.isArray(result.json.results)?result.json.results:[];
    total=Number(result.json.total_count??rows.length);
    out.push(...rows);
    if(!rows.length||rows.length<Number(params.get("limit")))break;
    offset+=rows.length;
  }
  return {rows:out,total,portal};
}
function cultureSpatialParams(geoField){
  const e=largestExtent();
  return {where:`in_bbox(${cultureFieldToken(geoField.name)}, ${e.south}, ${e.west}, ${e.north}, ${e.east})`};
}
function cultureDepartmentParams(fieldInfo){
  if(!fieldInfo)return [];
  const token=cultureFieldToken(fieldInfo.field.name),numeric=/code|num|^dpt$|^dep$/.test(fieldInfo.hay);
  const values=numeric?["16","016"]:["Charente","16"];
  return values.map(value=>({where:`${token} = "${value}"`}));
}
async function fetchCultureFromDataset(dataset,category,ds){
  const metadata=await cultureFetchMetadata(dataset);
  const geoField=cultureFindGeoField(metadata,ds);
  let fetched=null,strategy="",spatialError="";
  if(geoField){
    try{
      fetched=await cultureFetchPages(dataset,cultureSpatialParams(geoField),650);
      strategy=`emprise via ${geoField.name}`;
    }catch(err){spatialError=err?.message||String(err)}
  }
  if(!fetched){
    const department=cultureFindDepartmentField(metadata),departmentQueries=cultureDepartmentParams(department);
    for(const query of departmentQueries){
      try{
        const candidate=await cultureFetchPages(dataset,query,Math.min(ds.fullScanCap||2000,3500));
        if(candidate.rows.length){fetched=candidate;strategy=`département via ${department.field.name}`;break}
      }catch{}
    }
    const recordCount=Number(metadata?.metas?.default?.records_count??metadata?.records_count??Infinity);
    if(!fetched&&ds.allowFullScan&&recordCount<=(ds.fullScanCap||2000)){
      fetched=await cultureFetchPages(dataset,{},ds.fullScanCap||2000);
      strategy="catalogue complet filtré localement";
    }
  }
  if(!fetched)throw new Error(`${spatialError?`filtre spatial refusé : ${spatialError} · `:""}aucun repli départemental exploitable`);
  const syncedAt=new Date().toISOString();
  const items=fetched.rows.map((raw,index)=>normalizeCultureRecord({...raw,_atlasDataset:dataset,_atlasApiVersion:"2.1",_atlasSyncedAt:syncedAt,_atlasRecordId:raw.recordid||raw.id||`${dataset}-${index}`},category)).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
  return {items,dataset,strategy,portal:fetched.portal,total:fetched.total,received:fetched.rows.length};
}
async function fetchCultureDataset(category){
  const ds=CULTURE_DATASETS[category];if(!ds)return {items:[],dataset:"",strategy:""};
  const errors=[];

  // Chemin prioritaire, pensé pour fonctionner depuis un fichier HTML local.
  try{return await fetchCultureFromDataGouv(category)}
  catch(err){errors.push(`data.gouv tabulaire: ${err?.message||err}`)}

  const ids=[ds.id,ds.fallbackId].filter(Boolean);
  for(const dataset of ids){
    const methods=LOCAL_FILE_MODE
      ? [()=>fetchCultureFromDatasetJsonp(dataset,category,ds),()=>fetchCultureFromDataset(dataset,category,ds)]
      : [()=>fetchCultureFromDataset(dataset,category,ds),()=>fetchCultureFromDatasetJsonp(dataset,category,ds)];
    for(const method of methods){
      try{return await method()}
      catch(err){errors.push(`${dataset}: ${err?.message||err}`)}
    }
  }
  throw new Error(`${ds.label} · ${errors.join(" · ")}`);
}
async function syncCultureHeritage(){
  const selected=["monument","garden","house","museum"].filter(k=>state.heritageEnabled[k]!==false);
  if(!selected.length){els.heritageHelp.textContent="Coche au moins une base du ministère de la Culture.";return}
  els.syncCultureHeritage.disabled=true;
  const items=[],reports=[],errors=[];
  try{
    for(let i=0;i<selected.length;i++){
      const category=selected[i],label=CULTURE_DATASETS[category].label;
      els.heritageHelp.textContent=`Ministère de la Culture · ${i+1}/${selected.length} · ${label}…`;
      try{
        const result=await fetchCultureDataset(category);
        items.push(...result.items);
        reports.push(`${label} ${result.items.length} · ${result.strategy}`);
      }catch(err){errors.push(err?.message||String(err))}
    }
    if(items.length)mergeHeritageItems(items);else updateHeritageUI();
    const reportText=reports.length?` Sources reçues : ${reports.join(" ; ")}.`:"";
    const conciseErrors=errors.map(value=>String(value).length>900?`${String(value).slice(0,900)}…`:String(value));
    const errorText=conciseErrors.length?` Échecs : ${conciseErrors.join(" | ")}.`:"";
    els.heritageHelp.innerHTML=`<strong>${items.length}</strong> notices culturelles reçues et mémorisées.${esc(reportText)}${errorText?` <details><summary>Diagnostic des sources en échec</summary>${esc(errorText)}</details>`:""} Source prioritaire : API tabulaire officielle de data.gouv.fr. Les liens POP restent accessibles dans les détails documentaires.`;
  }finally{els.syncCultureHeritage.disabled=false}
}
async function wikipediaDetails(pageIds){
  const out=[];
  for(let i=0;i<pageIds.length;i+=40){
    const q=new URLSearchParams({action:"query",format:"json",origin:"*",pageids:pageIds.slice(i,i+40).join("|"),prop:"extracts|info|pageprops",inprop:"url",exintro:"1",explaintext:"1",exsentences:"4",redirects:"1"});
    const r=await fetchWithTimeout(`${WIKIPEDIA_API}?${q}`,{},25000);if(!r.ok)throw new Error(`Wikipédia détails · HTTP ${r.status}`);
    const j=await r.json();out.push(...Object.values(j.query?.pages||{}));
  }
  return out;
}
async function syncWikipediaHeritage(){
  if(state.heritageEnabled.wikipedia===false){els.heritageHelp.textContent="La source Wikipédia est décochée.";return}
  els.syncWikipediaHeritage.disabled=true;els.heritageHelp.textContent="Recherche des pages géolocalisées autour de l’Atlas…";
  try{
    const q=new URLSearchParams({action:"query",format:"json",origin:"*",list:"geosearch",gscoord:`${CONFIG.dataCenter.lat}|${CONFIG.dataCenter.lon}`,gsradius:String(heritageQueryRadius()),gslimit:"100",gsnamespace:"0"});
    const r=await fetchWithTimeout(`${WIKIPEDIA_API}?${q}`,{},25000);if(!r.ok)throw new Error(`Wikipédia géolocalisation · HTTP ${r.status}`);
    const j=await r.json(),geo=j.query?.geosearch||[],details=await wikipediaDetails(geo.map(v=>v.pageid));
    const byId=new Map(details.map(v=>[Number(v.pageid),v]));
    const items=geo.map(g=>{
      const d=byId.get(Number(g.pageid))||{},extract=String(d.extract||"").replace(/\s+/g," ").trim();
      return normalizeHeritageItem({id:`WIKI-${g.pageid}`,category:"wikipedia",name:g.title,lat:+g.lat,lon:+g.lon,description:extract.slice(0,900),url:d.fullurl||`https://fr.wikipedia.org/?curid=${g.pageid}`,wikidata:d.pageprops?.wikibase_item||"",source:"Wikipédia francophone · page géolocalisée",license:"CC BY-SA",heritage:true});
    }).filter(Boolean).filter(v=>inExtent(v.lat,v.lon,largestExtent()));
    mergeHeritageItems(items);els.heritageHelp.innerHTML=`<strong>${items.length}</strong> pages géolocalisées trouvées. Les doublons proches d’une notice officielle ont été fusionnés pour enrichir son récit sans ajouter un second symbole.`;
  }catch(err){els.heritageHelp.textContent=`Wikipédia n’a pas répondu : ${err?.message||err}`}
  finally{els.syncWikipediaHeritage.disabled=false}
}
function clearHeritage(){state.heritageItems=[];saveHeritage();updateHeritageUI();render();els.heritageHelp.textContent="Couche synchronisée vidée. Les repères saisis manuellement restent intacts."}

function loreMarkerDefinition(category){
  const defs={
    historic:{glyph:"HI",cls:"c-lore-heritage",label:"bâtiment historique / patrimoine"},
    ruin:{glyph:"RU",cls:"c-lore-ruin",label:"ruine / maison ruinée"},
    friche:{glyph:"FR",cls:"c-lore-friche",label:"friche industrielle ou artisanale"},
    abandoned:{glyph:"AB",cls:"c-lore-abandoned",label:"urbanisme abandonné / infrastructure oubliée"},
    anecdote:{glyph:"AN",cls:"c-lore-anecdote",label:"anecdote locale / récit"},
    mystery:{glyph:"MY",cls:"c-lore-mystery",label:"lieu mystérieux / ambiance étrange"},
    view:{glyph:"VP",cls:"c-lore-view",label:"curiosité paysagère / point de vue"}
  };
  return defs[category]||defs.anecdote;
}
function extractOsmCavities(features){
  if(!Array.isArray(features))return [];
  const out=[];
  for(const f of features){
    const t=f?.tags||{};
    let marker=null,type="indéterminé",detail="";
    if(t.natural==="cave_entrance"){marker="N>";type="naturelle";detail="entrée de cavité cartographiée dans OpenStreetMap"}
    else if(t.man_made==="adit"){marker="A>";type="galerie ou réseau de galeries";detail="entrée artificielle / adit cartographié dans OpenStreetMap"}
    else if(t.man_made==="mineshaft"){marker="Av";type="puits";detail="puits cartographié dans OpenStreetMap"}
    if(!marker)continue;
    const p=f.coords?.[0];if(!Array.isArray(p)||!Number.isFinite(+p[0])||!Number.isFinite(+p[1]))continue;
    out.push({id:`OSM-${f.id}`,name:t.name||t.description||"Entrée OSM sans nom",type,detail,markerOverride:marker,lat:+p[1],lon:+p[0],source:"OpenStreetMap, repère contributif",osm:true,tags:t});
  }
  return out;
}
function refreshCavities(){
  const official=Array.isArray(state.officialCavities)?state.officialCavities:[];
  const merged=[...official];
  for(const c of state.osmCavities||[]){
    const duplicate=merged.some(o=>Number.isFinite(o.lat)&&distanceMeters(o,c)<45);
    if(!duplicate)merged.push(c);
  }
  for(const c of state.localCavities||[])merged.push(c);
  state.cavities=merged;
  populateCavitySelect();
  if(state.load.cavities!=="pending"){
    const geoloc=official.filter(c=>Number.isFinite(c.lat)).length;
    const label=`${geoloc} BRGM + ${(state.osmCavities||[]).length} OSM + ${(state.localCavities||[]).length} locaux`;
    setStatus("cavities",geoloc||state.osmCavities.length||state.localCavities.length?"ok":"bad",label);
  }
}
function localMarkerDefinition(glyph){
  const map={
    "A>":{type:"carrière",detail:"entrée artificielle observée",cls:"c-doc-anthropic"},
    "N>":{type:"naturelle",detail:"entrée naturelle observée",cls:"c-doc-natural"},
    "Av":{type:"puits",detail:"ouverture verticale artificielle observée",cls:"c-doc-anthropic"},
    "Nv":{type:"naturelle",detail:"ouverture verticale naturelle observée",cls:"c-doc-natural"},
    "?o":{type:"indéterminé",detail:"ouverture d’origine indéterminée observée",cls:"c-doc-unknown"}
  };
  return map[glyph]||map["?o"];
}

async function fetchCavities(){
  const cached=cacheGet("atlas-karst-cavities-v06");
  if(cached){
    state.officialCavities=Array.isArray(cached)?cached.map(normalizeCavityRecord).filter(Boolean):[];
    state.cavityInventoryOnly=false;
    state.load.cavities="ok";
    refreshCavities();
    render();
    return;
  }
  const base="https://services.arcgis.com/d3voDfTFbHOCRwVR/arcgis/rest/services/G%C3%A9orisques___inventaire_des_cavit%C3%A9s_souterraines__France_enti%C3%A8re_/FeatureServer/1/query";
  const e=largestExtent();
  const params=new URLSearchParams({
    where:"1=1",
    geometry:`${e.west},${e.south},${e.east},${e.north}`,
    geometryType:"esriGeometryEnvelope",
    inSR:"4326",
    spatialRel:"esriSpatialRelIntersects",
    outFields:"*",
    returnGeometry:"true",
    outSR:"4326",
    f:"geojson"
  });
  try{
    const r=await fetch(`${base}?${params.toString()}`);
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const geo=await r.json();
    if(!Array.isArray(geo.features))throw new Error("GeoJSON cavités incomplet");
    const cavs=geo.features.map(normalizeCavity).filter(Boolean);
    if(!cavs.length)throw new Error("Aucune cavité géolocalisée dans l’emprise");
    state.officialCavities=cavs;
    state.cavityInventoryOnly=false;
    cacheSet("atlas-karst-cavities-v06",cavs);
    state.load.cavities="ok";
  }catch(err){
    state.officialCavities=CAVITY_INVENTORY.map(c=>normalizeCavityRecord({...c,lat:null,lon:null,source:"inventaire communal sans coordonnées"}));
    state.cavityInventoryOnly=true;
    state.load.cavities="bad";
    console.warn("Cavités géolocalisées indisponibles",err);
  }
  refreshCavities();
  render();
}
function normalizeCavityRecord(c){
  if(!c||typeof c!=="object")return null;
  return {...c,id:text(c.id||c.numCavite||""),name:cavityName(c),type:cavityType(c),detail:text(c.detail),nature:text(c.nature),source:text(c.source,"BDCavités / Géorisques")};
}
function normalizeCavity(feature){
  const a=feature.properties||{};
  const c=feature.geometry?.coordinates;
  if(!Array.isArray(c)||!Number.isFinite(+c[0])||!Number.isFinite(+c[1]))return null;
  return {
    id:a.numCavite||a.numcavite||String(a.OBJECTID||""),
    name:a.nomCavite||a.nomcavite||"Cavité sans nom",
    type:text(a.TYPE_CAV||a.typeCavite||a.typecavite||a.natureCavite,"indéterminé").toLowerCase(),
    detail:a.typeCaviteAppauvri||a.typecaviteappauvri||a.natureCavite||a.naturecavite||"",
    nature:a.natureCavite||a.naturecavite||"",
    position:a.positionnement||a.positionnementAppauvri||a.reperageGeographique||"",
    precision:Number(a.precisionXY||a.precisionxy)||null,
    altitude:Number(a.zOuvrage||a.zouvrage)||null,
    comments:a.commentaires||"",
    commune:a.COMM_ESRI||a.commune||"",
    lat:+c[1],lon:+c[0],
    source:"BDCavités / Géorisques, adaptation Esri France"
  };
}

async function fetchWithTimeout(url,options={},timeoutMs=25000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function fetchElevationIgn(points){
  const values=[];
  for(let i=0;i<points.length;i+=100){
    const batch=points.slice(i,i+100);
    const lon=batch.map(p=>p.lon).join("|");
    const lat=batch.map(p=>p.lat).join("|");
    const q=new URLSearchParams({
      lon,lat,
      resource:"ign_rge_alti_wld",
      delimiter:"|",
      indent:"false",
      measures:"false",
      zonly:"true"
    });
    const url=`https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?${q}`;
    const r=await fetchWithTimeout(url,{},30000);
    if(!r.ok)throw new Error(`IGN HTTP ${r.status}`);
    const j=await r.json();
    const rows=Array.isArray(j.elevations)?j.elevations:null;
    if(!rows||rows.length!==batch.length)throw new Error(`IGN relief reçu : ${rows?.length||0}/${batch.length}`);
    const vals=rows.map(v=>Number(typeof v==="object"?v.z:v));
    if(vals.some(v=>!Number.isFinite(v)||v<=-99990))throw new Error("IGN a renvoyé une altitude invalide");
    values.push(...vals);
  }
  return values;
}
async function fetchElevationOpenMeteo(points){
  const values=[];
  for(let i=0;i<points.length;i+=80){
    const batch=points.slice(i,i+80);
    const q=new URLSearchParams({
      latitude:batch.map(p=>p.lat).join(","),
      longitude:batch.map(p=>p.lon).join(",")
    });
    const url=`https://api.open-meteo.com/v1/elevation?${q}`;
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      try{
        const r=await fetchWithTimeout(url,{},25000);
        if(!r.ok)throw new Error(`Open‑Meteo HTTP ${r.status}`);
        const j=await r.json();
        const vals=Array.isArray(j.elevation)?j.elevation.map(Number):null;
        if(!vals||vals.length!==batch.length||vals.some(v=>!Number.isFinite(v))){
          throw new Error(`Open‑Meteo relief reçu : ${vals?.length||0}/${batch.length}`);
        }
        values.push(...vals);
        lastError=null;
        break;
      }catch(err){
        lastError=err;
        if(attempt===0)await new Promise(resolve=>setTimeout(resolve,700));
      }
    }
    if(lastError)throw lastError;
  }
  return values;
}
async function fetchElevation(){
  const cached=cacheGet("atlas-karst-elevation-v09d");
  if(cached){
    state.elevation=cached;
    setStatus("elevation","ok",`cache ${cached.source||"local"}`);
    render();
    return;
  }
  const e=largestExtent(),cols=23,rows=17,points=[];
  for(let y=0;y<rows;y++){
    const lat=e.north-(y/(rows-1))*(e.north-e.south);
    for(let x=0;x<cols;x++){
      const lon=e.west+(x/(cols-1))*(e.east-e.west);
      points.push({lat:lat.toFixed(5),lon:lon.toFixed(5)});
    }
  }
  let values=null,source="",ignError=null,openMeteoError=null;
  try{
    values=await fetchElevationIgn(points);
    source="IGN RGE ALTI";
  }catch(err){
    ignError=err;
    console.warn("Relief IGN indisponible, tentative Open-Meteo",err);
    try{
      values=await fetchElevationOpenMeteo(points);
      source="Open‑Meteo / Copernicus";
    }catch(fallbackErr){
      openMeteoError=fallbackErr;
    }
  }
  if(values&&values.length===points.length){
    state.elevation={extent:e,cols,rows,values,source};
    cacheSet("atlas-karst-elevation-v09d",state.elevation);
    setStatus("elevation","ok",`${values.length} points · ${source}`);
  }else{
    state.elevation=null;
    setStatus("elevation","bad","2 sources indisponibles");
    console.warn("Relief indisponible",{
      ign:ignError?.message||ignError,
      openMeteo:openMeteoError?.message||openMeteoError
    });
  }
  render();
}

function elevationAt(lat,lon){
  const d=state.elevation;if(!d)return null;
  const fx=(lon-d.extent.west)/(d.extent.east-d.extent.west)*(d.cols-1);
  const fy=(d.extent.north-lat)/(d.extent.north-d.extent.south)*(d.rows-1);
  if(fx<0||fy<0||fx>d.cols-1||fy>d.rows-1)return null;
  const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(d.cols-1,x0+1),y1=Math.min(d.rows-1,y0+1);
  const tx=fx-x0,ty=fy-y0;
  const v=(x,y)=>d.values[y*d.cols+x];
  return v(x0,y0)*(1-tx)*(1-ty)+v(x1,y0)*tx*(1-ty)+v(x0,y1)*(1-tx)*ty+v(x1,y1)*tx*ty;
}


async function fetchJsonMaybeGzip(url){
  const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const buf=await r.arrayBuffer();
  const bytes=new Uint8Array(buf);
  let textData="";
  if(bytes[0]===0x1f&&bytes[1]===0x8b){
    if(!("DecompressionStream" in window))throw new Error("Décompression gzip non prise en charge par ce navigateur");
    const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    textData=await new Response(stream).text();
  }else textData=new TextDecoder().decode(bytes);
  return JSON.parse(textData);
}
function geometryRings(geometry){
  if(!geometry)return [];
  if(geometry.type==="Polygon")return geometry.coordinates?.length?[geometry.coordinates[0]]:[];
  if(geometry.type==="MultiPolygon")return (geometry.coordinates||[]).map(p=>p[0]).filter(Boolean);
  return [];
}
function normalizeCadastre(fc,kind){
  const out=[];
  for(const f of fc?.features||[]){
    for(const coords of geometryRings(f.geometry)){
      if(!coords?.length)continue;
      const lons=coords.map(p=>+p[0]),lats=coords.map(p=>+p[1]);
      if(!lons.every(Number.isFinite)||!lats.every(Number.isFinite))continue;
      out.push({id:f.id||f.properties?.id||"",kind,properties:f.properties||{},coords:coords.map(p=>[+p[0],+p[1]]),bbox:{west:Math.min(...lons),east:Math.max(...lons),south:Math.min(...lats),north:Math.max(...lats)}});
    }
  }
  return out;
}
async function fetchCadastre(){
  const cached=cacheGet("atlas-karst-cadastre-v06");
  if(cached){state.cadastreBuildings=cached.buildings||[];state.cadastreParcels=cached.parcels||[];setStatus("cadastre","ok",`cache · ${state.cadastreBuildings.length} bât.`);autoSnapHouse();render();return}
  const root="https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/16/16418";
  try{
    const [buildingsFc,parcelsFc]=await Promise.all([
      fetchJsonMaybeGzip(`${root}/cadastre-16418-batiments.json.gz`),
      fetchJsonMaybeGzip(`${root}/cadastre-16418-parcelles.json.gz`)
    ]);
    state.cadastreBuildings=normalizeCadastre(buildingsFc,"building");
    state.cadastreParcels=normalizeCadastre(parcelsFc,"parcel");
    cacheSet("atlas-karst-cadastre-v06",{buildings:state.cadastreBuildings,parcels:state.cadastreParcels});
    setStatus("cadastre","ok",`${state.cadastreBuildings.length} bât. · ${state.cadastreParcels.length} parc.`);
    autoSnapHouse();
  }catch(err){setStatus("cadastre","bad","indisponible");console.warn("Cadastre indisponible",err)}
  render();
}
function polygonCentroid(coords){
  let x=0,y=0,a=0;
  for(let i=0,j=coords.length-1;i<coords.length;j=i++){
    const f=coords[j][0]*coords[i][1]-coords[i][0]*coords[j][1];a+=f;x+=(coords[j][0]+coords[i][0])*f;y+=(coords[j][1]+coords[i][1])*f;
  }
  if(Math.abs(a)<1e-12){return {lon:coords.reduce((s,p)=>s+p[0],0)/coords.length,lat:coords.reduce((s,p)=>s+p[1],0)/coords.length}}
  return {lon:x/(3*a),lat:y/(3*a)};
}
function pointInLonLat(point,coords){
  let inside=false;
  for(let i=0,j=coords.length-1;i<coords.length;j=i++){
    const xi=coords[i][0],yi=coords[i][1],xj=coords[j][0],yj=coords[j][1];
    const hit=((yi>point.lat)!==(yj>point.lat))&&(point.lon<(xj-xi)*(point.lat-yi)/(yj-yi+1e-15)+xi);if(hit)inside=!inside;
  }
  return inside;
}
function nearestCadastreBuilding(point){
  let best=null;
  for(const b of state.cadastreBuildings){
    if(pointInLonLat(point,b.coords))return {...b,centroid:polygonCentroid(b.coords),distance:0};
    const c=polygonCentroid(b.coords),d=distanceMeters(point,{lat:c.lat,lon:c.lon});
    if(!best||d<best.distance)best={...b,centroid:c,distance:d};
  }
  return best&&best.distance<180?best:null;
}
function snapHouseToBuilding(persist=true){
  if(!state.cadastreBuildings.length){els.houseHelp.innerHTML='<span class="house-placement-note">Le cadastre n’est pas chargé.</span>';return false}
  const b=nearestCadastreBuilding(state.address||CONFIG.house);
  if(!b){els.houseHelp.innerHTML='<span class="house-placement-note">Aucun bâtiment cadastral suffisamment proche.</span>';return false}
  state.houseBuilding=b;
  saveHousePosition({lat:b.centroid.lat,lon:b.centroid.lon},`centre du bâtiment cadastral le plus proche (${Math.round(b.distance)} m du point de référence)`,persist);
  return true;
}
function autoSnapHouse(){
  if(!HOUSE_WAS_SAVED&&state.address&&state.cadastreBuildings.length)snapHouseToBuilding(false);
}
async function fetchAddress(force=false){
  const cached=!force&&cacheGet("atlas-karst-address-v06");
  if(cached){state.address=cached;setStatus("address","ok",`cache · score ${Math.round((cached.score||0)*100)} %`);if(!HOUSE_WAS_SAVED){CONFIG.house={lat:cached.lat,lon:cached.lon};autoSnapHouse();render()}return cached}
  const q=encodeURIComponent("42 rue de la Falaise 16400 Vœuil-et-Giget");
  const url=`https://data.geopf.fr/geocodage/search?q=${q}&index=address&limit=5`;
  try{
    const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json();
    const f=j.features?.[0];const c=f?.geometry?.coordinates;if(!Array.isArray(c)||!Number.isFinite(+c[0])||!Number.isFinite(+c[1]))throw new Error("Adresse non trouvée");
    state.address={lon:+c[0],lat:+c[1],label:f.properties?.label||"42 rue de la Falaise",score:+f.properties?.score||0,id:f.properties?.id||"",source:"Géoplateforme / Base Adresse Nationale"};
    cacheSet("atlas-karst-address-v06",state.address);setStatus("address","ok",`score ${Math.round(state.address.score*100)} %`);
    if(force||!HOUSE_WAS_SAVED){CONFIG.house={lat:state.address.lat,lon:state.address.lon};if(force)HOUSE_WAS_SAVED=false;autoSnapHouse();render()}
    return state.address;
  }catch(err){setStatus("address","bad","non trouvée");console.warn("Adresse officielle indisponible",err);return null}
}

function normalizeHeaderName(s){
  return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
function firstRowValue(row, candidates){
  const normalized={};
  for(const [k,v] of Object.entries(row))normalized[normalizeHeaderName(k)]=v;
  for(const c of candidates){
    const v=normalized[normalizeHeaderName(c)];
    if(v!=null&&String(v).trim()!=="")return v;
  }
  return "";
}
function numericLoose(v){
  if(typeof v==="number")return v;
  const s=String(v??"").trim().replace(/\s/g,"").replace(",",".");
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function inverseIsoLatitude(L,e){
  let lat=2*Math.atan(Math.exp(L))-Math.PI/2;
  for(let i=0;i<15;i++){
    const next=2*Math.atan(
      Math.pow((1+e*Math.sin(lat))/(1-e*Math.sin(lat)),e/2)*Math.exp(L)
    )-Math.PI/2;
    if(Math.abs(next-lat)<1e-13)return next;
    lat=next;
  }
  return lat;
}
function inverseLambertConformal(x,y,params){
  const dx=x-params.xs,dy=y-params.ys;
  const R=Math.hypot(dx,dy);
  const gamma=Math.atan2(dx,params.ys-y);
  const lon=params.lon0+gamma/params.n;
  const L=-Math.log(Math.abs(R/params.c))/params.n;
  const lat=inverseIsoLatitude(L,params.e);
  return {lat,lon};
}
function geodeticToCartesian(lat,lon,h,a,e2){
  const sin=Math.sin(lat),cos=Math.cos(lat);
  const N=a/Math.sqrt(1-e2*sin*sin);
  return {
    x:(N+h)*cos*Math.cos(lon),
    y:(N+h)*cos*Math.sin(lon),
    z:(N*(1-e2)+h)*sin
  };
}
function cartesianToGeodetic(x,y,z,a,e2){
  const lon=Math.atan2(y,x),p=Math.hypot(x,y);
  let lat=Math.atan2(z,p*(1-e2)),h=0;
  for(let i=0;i<15;i++){
    const sin=Math.sin(lat),N=a/Math.sqrt(1-e2*sin*sin);
    h=p/Math.cos(lat)-N;
    const next=Math.atan2(z,p*(1-e2*N/(N+h)));
    if(Math.abs(next-lat)<1e-13){lat=next;break}
    lat=next;
  }
  return {lat,lon,h};
}
function lambert93ToWgs84(x,y){
  const p={
    n:0.7256077650532670,
    c:11754255.426096,
    xs:700000,
    ys:12655612.049876,
    lon0:3*Math.PI/180,
    e:0.0818191910428158
  };
  const g=inverseLambertConformal(x,y,p);
  return {lat:g.lat*180/Math.PI,lon:g.lon*180/Math.PI,coordinateSource:"Lambert‑93 converti"};
}
function lambert2ExtendedToWgs84(x,y){
  const aNtf=6378249.2,bNtf=6356515.0;
  const e2Ntf=1-(bNtf/aNtf)**2,eNtf=Math.sqrt(e2Ntf);
  const p={
    n:0.7289686274,
    c:11745793.39,
    xs:600000,
    ys:8199695.768,
    lon0:0.04079234433198,
    e:eNtf
  };
  const ntf=inverseLambertConformal(x,y,p);
  const cart=geodeticToCartesian(ntf.lat,ntf.lon,0,aNtf,e2Ntf);
  // Transformation NTF vers WGS84, translation géocentrique en mètres.
  const shifted={x:cart.x-168,y:cart.y-60,z:cart.z+320};
  const aWgs=6378137,f=1/298.257223563,e2Wgs=f*(2-f);
  const wgs=cartesianToGeodetic(shifted.x,shifted.y,shifted.z,aWgs,e2Wgs);
  return {lat:wgs.lat*180/Math.PI,lon:wgs.lon*180/Math.PI,coordinateSource:"Lambert II étendu converti"};
}
function plausibleFranceCoordinate(p){
  return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&
    p.lat>=41&&p.lat<=52&&p.lon>=-7&&p.lon<=11;
}
function parseGoogleMapsCoordinate(value){
  const raw=String(value??"").trim();
  if(!raw)return null;
  let decoded=raw;
  try{decoded=decodeURIComponent(raw)}catch{}
  const patterns=[
    /@(-?\d{1,2}(?:[.,]\d+)?),\s*(-?\d{1,3}(?:[.,]\d+)?)/,
    /(?:query|q|ll|center)=(-?\d{1,2}(?:[.,]\d+)?)[,%20+\s]+(-?\d{1,3}(?:[.,]\d+)?)/i,
    /maps\/place\/[^/]*\/@(-?\d{1,2}(?:[.,]\d+)?),\s*(-?\d{1,3}(?:[.,]\d+)?)/i,
    /(-?\d{1,2}\.\d{4,})\s*[,;]\s*(-?\d{1,3}\.\d{4,})/
  ];
  for(const pattern of patterns){
    const m=decoded.match(pattern);
    if(!m)continue;
    const a=Number(m[1].replace(",",".")),b=Number(m[2].replace(",","."));
    const candidates=[
      {lat:a,lon:b},
      {lat:b,lon:a}
    ].filter(plausibleFranceCoordinate);
    if(candidates.length){
      candidates.sort((u,v)=>distanceMeters(CONFIG.dataCenter,u)-distanceMeters(CONFIG.dataCenter,v));
      return {...candidates[0],coordinateSource:"coordonnées du lien Google Maps"};
    }
  }
  return null;
}
function coordinateFromProjectedXY(x,y,projectionLabel,sourceLabel){
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const projection=normalizeHeaderName(projectionLabel||"");

  // The export may carry decimal WGS84 coordinates even in X/Y-labelled fields.
  if(Math.abs(x)<=180&&Math.abs(y)<=90){
    const direct={lat:y,lon:x,coordinateSource:`${sourceLabel} · WGS84 X/Y`};
    if(plausibleFranceCoordinate(direct))return direct;
  }
  if(Math.abs(y)<=180&&Math.abs(x)<=90){
    const swapped={lat:x,lon:y,coordinateSource:`${sourceLabel} · WGS84 Y/X`};
    if(plausibleFranceCoordinate(swapped))return swapped;
  }

  if(
    projection.includes("2154") ||
    projection.includes("lambert_93") ||
    projection.includes("lambert93") ||
    projection==="l93"
  ){
    const p=lambert93ToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert‑93 converti`};
  }

  if(
    projection.includes("27572") ||
    projection.includes("lambert_ii_etendu") ||
    projection.includes("lambert_2_etendu") ||
    projection.includes("lambert2etendu") ||
    projection.includes("l2e")
  ){
    const p=lambert2ExtendedToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert II étendu converti`};
  }

  // REF06 data are frequently delivered in a national metric reference.
  // Use numeric ranges only after explicit projection labels have been tested.
  if(y>5_500_000&&y<7_500_000&&x>-200_000&&x<1_500_000){
    const p=lambert93ToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert‑93 détecté`};
  }
  if(y>1_500_000&&y<3_000_000&&x>-200_000&&x<1_500_000){
    const p=lambert2ExtendedToWgs84(x,y);
    if(plausibleFranceCoordinate(p))return {...p,coordinateSource:`${sourceLabel} · Lambert II étendu détecté`};
  }
  return null;
}
function bssCoordinateFromRow(row){
  // 1. Explicit geographic coordinates when an export includes them.
  let lat=numericLoose(firstRowValue(row,[
    "latitude","lat","latitude_wgs84","lat_wgs84","y_wgs84","coord_y_wgs84",
    "coordonnee_y_wgs84","latitude_decimale","y_wgs_84"
  ]));
  let lon=numericLoose(firstRowValue(row,[
    "longitude","lon","long","longitude_wgs84","lon_wgs84","x_wgs84","coord_x_wgs84",
    "coordonnee_x_wgs84","longitude_decimale","x_wgs_84"
  ]));
  if(Number.isFinite(lat)&&Number.isFinite(lon)){
    if(Math.abs(lat)<20&&Math.abs(lon)>20)[lat,lon]=[lon,lat];
    const p={lat,lon,coordinateSource:"WGS84 du CSV"};
    if(plausibleFranceCoordinate(p))return p;
  }

  // 2. Exact BRGM fields: coordinates as originally entered.
  const xSaisie=numericLoose(firstRowValue(row,["x_saisie"]));
  const ySaisie=numericLoose(firstRowValue(row,["y_saisie"]));
  const projectionSaisie=firstRowValue(row,[
    "lex_projection_saisie","projection_saisie","srs_saisie"
  ]);
  const saisie=coordinateFromProjectedXY(
    xSaisie,ySaisie,projectionSaisie,"coordonnées BRGM saisies"
  );
  if(saisie)return saisie;

  // 3. Exact BRGM fields: standardized/reference coordinates.
  const xRef06=numericLoose(firstRowValue(row,["x_ref06","x_ref_06"]));
  const yRef06=numericLoose(firstRowValue(row,["y_ref06","y_ref_06"]));
  const projectionRef06=firstRowValue(row,[
    "lex_projection_ref06","projection_ref06","projection_ref_06","srs_ref06"
  ]);
  const ref06=coordinateFromProjectedXY(
    xRef06,yRef06,projectionRef06,"coordonnées BRGM de référence"
  );
  if(ref06)return ref06;

  // 4. Explicit Lambert column variants used by other BRGM exports.
  const x93=numericLoose(firstRowValue(row,[
    "x_l93","xl93","x_lambert93","x_lambert_93","coord_x_l93","coordonnee_x_l93",
    "lambert93_x","x_2154","coord_x_lambert93"
  ]));
  const y93=numericLoose(firstRowValue(row,[
    "y_l93","yl93","y_lambert93","y_lambert_93","coord_y_l93","coordonnee_y_l93",
    "lambert93_y","y_2154","coord_y_lambert93"
  ]));
  const explicit93=coordinateFromProjectedXY(x93,y93,"EPSG:2154","colonnes Lambert‑93");
  if(explicit93)return explicit93;

  const x2e=numericLoose(firstRowValue(row,[
    "x_l2e","xl2e","x_lambert2e","x_lambert_2_etendu","coord_x_l2e",
    "coordonnee_x_l2e","lambert2etendu_x","x_27572"
  ]));
  const y2e=numericLoose(firstRowValue(row,[
    "y_l2e","yl2e","y_lambert2e","y_lambert_2_etendu","coord_y_l2e",
    "coordonnee_y_l2e","lambert2etendu_y","y_27572"
  ]));
  const explicit2e=coordinateFromProjectedXY(x2e,y2e,"EPSG:27572","colonnes Lambert II étendu");
  if(explicit2e)return explicit2e;

  // 5. Generic X/Y fields.
  const x=numericLoose(firstRowValue(row,[
    "x","coord_x","coordonnee_x","x_coord","abscisse","coordx"
  ]));
  const y=numericLoose(firstRowValue(row,[
    "y","coord_y","coordonnee_y","y_coord","ordonnee","coordy"
  ]));
  const projection=firstRowValue(row,[
    "projection","systeme_coordonnees","srs","epsg","referentiel","systeme"
  ]);
  const generic=coordinateFromProjectedXY(x,y,projection,"colonnes X/Y");
  if(generic)return generic;

  // 6. The export shown by the user includes a Google Maps URL.
  const google=parseGoogleMapsCoordinate(firstRowValue(row,[
    "google_maps","google_map","lien_google_maps","url_google_maps"
  ]));
  if(google)return google;

  return null;
}
function normalizeBssCsvRow(row){
  const coord=bssCoordinateFromRow(row);
  if(!coord)return null;
  const {lat,lon}=coord;
  const depth=numericLoose(firstRowValue(row,[
    "profondeur","profondeur_investigation","profondeur_finale","profondeur_totale",
    "prof_fin","prof_finale","prof_max","profondeur_maximale","profondeur_atteinte","prof_investigation","prof_accessible"
  ]));
  const altitude=numericLoose(firstRowValue(row,[
    "altitude","altitude_sol","cote_sol","z","z_sol","altitude_ngf","z_bdalti"
  ]));
  const id=String(firstRowValue(row,[
    "code_bss","bss_id","identifiant_bss","code_national","numero_bss","num_dossier",
    "indice_bss","nouveau_code_bss","ancien_code_bss","id_bss","indice"
  ])||"BSS importé");
  const nature=String(firstRowValue(row,[
    "nature","type_ouvrage","nature_ouvrage","type","objet","usage","designation","lex_nature",
    "lex_nature","nature_point"
  ])||"ouvrage de la Banque du sous-sol");
  const name=String(firstRowValue(row,[
    "nom","libelle","nom_ouvrage","denomination","designation","nom_abrege","lieu_dit","lex_nom_commune","commune","nom_local",
    "adresse_lieu_dit"
  ])||id);
  return {
    id,name,lat,lon,
    depth:Number.isFinite(depth)?depth:null,
    altitude:Number.isFinite(altitude)?altitude:null,
    nature,coordinateSource:coord.coordinateSource,
    properties:row,source:"BRGM · BSS, import CSV départemental",imported:true
  };
}

function mergeBssItems(...groups){
  const merged=new Map();
  for(const group of groups){
    for(const raw of group||[]){
      if(!raw||!Number.isFinite(+raw.lat)||!Number.isFinite(+raw.lon))continue;
      const item={...raw,lat:+raw.lat,lon:+raw.lon};
      const id=String(item.id||`${item.lat.toFixed(6)}:${item.lon.toFixed(6)}`);
      const previous=merged.get(id);
      // Later sources enrich the embedded record. A Hub'Eau record keeps the
      // official BSS identity while adding its piézometric role.
      merged.set(id,previous?{...previous,...item,id}:{...item,id});
    }
  }
  return [...merged.values()];
}
function saveBssLocal(){
  try{
    // Embedded BRGM rows are already in the HTML. Only save additions or richer
    // Hub'Eau/imported records to avoid duplicating 736 rows in localStorage.
    const additions=state.bss.filter(p=>!p.embedded||p.piezo);
    localStorage.setItem(BSS_LOCAL_KEY,JSON.stringify({savedAt:Date.now(),items:additions}));
  }catch{}
}
function loadBssLocal(){
  let additions=[];
  try{
    const v=JSON.parse(localStorage.getItem(BSS_LOCAL_KEY)||"null");
    if(v&&Array.isArray(v.items))additions=v.items;
  }catch{}
  state.bss=mergeBssItems(BSS_EMBEDDED_LOCAL,additions);
  updateBssUI();
}
function updateBssUI(message=""){
  const embedded=state.bss.filter(p=>p.embedded).length;
  const piezo=state.bss.filter(p=>p.piezo).length;
  const additions=state.bss.filter(p=>!p.embedded&&!p.piezo).length;
  if(els.bssCount)els.bssCount.textContent=state.bss.length;
  if(els.bssSummary){
    els.bssSummary.textContent=message||`${embedded} BSS embarqués · ${piezo} piézomètres${additions?` · ${additions} ajouts`:""}`;
  }
  setStatus("bss","ok",`${state.bss.length} points locaux`);
}

function parseGenericCsv(textData, onRow){
  const firstBreak=textData.search(/\r?\n/);
  const delimiter=detectDelimiter(textData.slice(0,firstBreak<0?textData.length:firstBreak));
  let row=[],cell="",quoted=false,headers=null;
  const finishCell=()=>{row.push(cell);cell=""};
  const finishRow=()=>{
    if(!headers)headers=row.map(v=>v.replace(/^\uFEFF/,"").trim());
    else if(row.some(v=>String(v).trim()!=="")){
      const obj={};headers.forEach((h,i)=>obj[h]=row[i]??"");onRow(obj);
    }
    row=[];
  };
  for(let i=0;i<textData.length;i++){
    const ch=textData[i];
    if(quoted){
      if(ch==='"'&&textData[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===delimiter)finishCell();
      else if(ch==="\n"){finishCell();finishRow()}
      else if(ch!=="\r")cell+=ch;
    }
  }
  if(cell.length||row.length){finishCell();finishRow()}
}
async function importBssFile(file){
  if(!file)return;
  els.bssHelp.textContent=`Lecture de ${file.name}…`;
  try{
    const txt=await file.text(),items=[],e=largestExtent();
    const stats={rows:0,geolocated:0,inside:0,lambert93:0,lambert2e:0,wgs84:0,googleMaps:0,saisie:0,ref06:0,nearest:null,headers:[]};
    parseGenericCsv(txt,row=>{
      stats.rows++;
      if(!stats.headers.length)stats.headers=Object.keys(row);
      const p=normalizeBssCsvRow(row);
      if(!p)return;
      stats.geolocated++;
      if(p.coordinateSource.includes("Google Maps"))stats.googleMaps++;
      if(p.coordinateSource.includes("saisies"))stats.saisie++;
      if(p.coordinateSource.includes("référence"))stats.ref06++;
      if(p.coordinateSource.includes("Lambert‑93"))stats.lambert93++;
      else if(p.coordinateSource.includes("Lambert II"))stats.lambert2e++;
      else if(!p.coordinateSource.includes("Google Maps"))stats.wgs84++;
      const d=distanceMeters(CONFIG.dataCenter,p);
      if(!stats.nearest||d<stats.nearest.distance)stats.nearest={distance:d,item:p};
      if(inExtent(p.lat,p.lon,e)){items.push(p);stats.inside++}
    });

    if(stats.rows&&stats.geolocated===0){
      throw new Error(
        `aucune coordonnée reconnue parmi ${stats.rows.toLocaleString("fr-FR")} lignes · `+
        `colonnes vues : ${stats.headers.join(", ")}`
      );
    }

    const existingPiezo=state.bss.filter(p=>p.piezo);
    state.bss=mergeBssItems(BSS_EMBEDDED_LOCAL,items,existingPiezo);
    saveBssLocal();
    updateBssUI(`Import BSS · ${items.length} ouvrages locaux · ${stats.geolocated.toLocaleString("fr-FR")} géolocalisés`);
    els.layerBss.checked=true;state.layerBss=true;

    if(items.length){
      els.bssHelp.innerHTML=
        `<strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues · `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées · `+
        `<strong>${stats.saisie}</strong> coordonnées saisies · `+
        `<strong>${stats.ref06}</strong> coordonnées de référence · `+
        `<strong>${stats.googleMaps}</strong> liens Google Maps · `+
        `<strong>${items.length}</strong> dans l’emprise locale.`;
    }else{
      const nearest=stats.nearest;
      const nearestText=nearest
        ? ` Le point le plus proche est <strong>${esc(nearest.item.name)}</strong>, à environ `+
          `<strong>${(nearest.distance/1000).toFixed(1)} km</strong> `+
          `(${nearest.item.lat.toFixed(5)}, ${nearest.item.lon.toFixed(5)} · ${esc(nearest.item.coordinateSource)}).`
        : "";
      els.bssHelp.innerHTML=
        `Le fichier est compris : <strong>${stats.rows.toLocaleString("fr-FR")}</strong> lignes lues, `+
        `<strong>${stats.geolocated.toLocaleString("fr-FR")}</strong> géolocalisées `+
        `(${stats.saisie} saisies BRGM, ${stats.ref06} références BRGM, ${stats.googleMaps} liens Google Maps), `+
        `mais aucune dans l’emprise actuelle.${nearestText}`;
    }
    render();
  }catch(err){
    els.bssHelp.textContent=`Import impossible : ${err?.message||"format non reconnu"}`;
  }finally{els.bssFile.value=""}
}

async function syncHubeauPiezo(){
  els.syncPiezo.disabled=true;els.bssHelp.textContent="Recherche des stations piézométriques Hub’Eau en Charente…";
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    const q=new URLSearchParams({code_departement:"16",format:"json",size:"200"});
    const r=await fetch(`${HUBEAU_PIEZO_URL}?${q}`,{signal:controller.signal});
    clearTimeout(timer);
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const j=await r.json(),e=largestExtent(),points=[];
    for(const s of j.data||[]){
      const lon=Number(s.x??s.geometry?.coordinates?.[0]),lat=Number(s.y??s.geometry?.coordinates?.[1]);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||!inExtent(lat,lon,e))continue;
      const depth=Number(s.profondeur_investigation);
      points.push({
        id:String(s.bss_id||s.code_bss||"Piézomètre"),
        name:String(s.nom_station||s.libelle_pe||s.nom_commune||"Piézomètre"),
        lat,lon,depth:Number.isFinite(depth)?depth:null,
        altitude:Number.isFinite(Number(s.altitude_station))?Number(s.altitude_station):null,
        nature:String(s.nature_point_eau||"piézomètre"),
        source:"Hub’Eau Piézométrie / ADES",piezo:true,properties:s
      });
    }
    const existing=state.bss.filter(p=>!p.piezo);
    state.bss=mergeBssItems(existing,points);
    saveBssLocal();updateBssUI(`Hub’Eau · ${points.length} stations dans l’emprise locale`);
    els.layerBss.checked=true;state.layerBss=true;
    els.bssHelp.innerHTML=points.length
      ? `${points.length} station${points.length>1?"s":""} piézométrique${points.length>1?"s":""} chargée${points.length>1?"s":""}. Cette source ne remplace pas l’inventaire BSS complet.`
      : `Hub’Eau a répondu, mais aucune station piézométrique suivie ne se trouve dans l’emprise actuelle.`;
    render();
  }catch(err){
    els.bssHelp.innerHTML=`Hub’Eau n’a pas répondu (${esc(err?.message||"erreur réseau")}). La carte reste utilisable ; l’import CSV BSS demeure disponible.`;
    updateBssUI();
  }finally{els.syncPiezo.disabled=false}
}
function normalizeBssGeoJSON(j){
  const out=[];
  for(const f of j?.features||[]){
    let c=f.geometry?.coordinates;if(!Array.isArray(c))continue;if(Array.isArray(c[0]))c=c[0];
    let lon=+c[0],lat=+c[1];if(Math.abs(lon)>20&&Math.abs(lat)<20)[lon,lat]=[lat,lon];
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    const a=f.properties||{};
    const first=(...keys)=>{for(const k of keys)if(a[k]!=null&&a[k]!=="")return a[k];return ""};
    const depth=Number(first("PROFONDEUR","PROF_TOTALE","PROF_FINAL","PROFONDEU","profondeur"));
    out.push({id:String(first("CODE_BSS","ID_BSS","BSS_ID","NUMERO","code_bss",f.id)||f.id||"BSS"),name:String(first("NOM","LIBELLE","LABEL","LIEU_DIT","nom")||"Ouvrage BSS"),lat,lon,depth:Number.isFinite(depth)?depth:null,nature:String(first("NATURE","TYPE_OUVRAGE","TYPE","nature")||"ouvrage de la Banque du sous-sol"),properties:a,source:"BRGM · Banque du sous-sol (WFS InfoTerre)"});
  }
  return out;
}
async function fetchBss(){
  loadBssLocal();
  if(!state.bss.length)setStatus("bss","pending","non chargé · optionnel");
  return state.bss;
}
function bearingDegrees(a,b){
  const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lon-a.lon);const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function confidenceLabel(v){return v==="high"?"forte":v==="low"?"faible":"moyenne"}

function createGrid(extent){
  const grid=[];
  const elevations=[];
  let minE=Infinity,maxE=-Infinity;
  for(let y=0;y<CONFIG.gridH;y++){
    const row=[];const er=[];
    for(let x=0;x<CONFIG.gridW;x++){
      const c=gridToCoord(x,y,extent), elev=elevationAt(c.lat,c.lon);
      if(Number.isFinite(elev)){minE=Math.min(minE,elev);maxE=Math.max(maxE,elev)}
      er.push(elev);
      row.push({ch:" ",cls:"",priority:0,feature:null,confidence:null,elev});
    }
    elevations.push(er);grid.push(row);
  }
  return {
    grid,elevations,
    minE:Number.isFinite(minE)?minE:null,
    maxE:Number.isFinite(maxE)?maxE:null,
    extent,
    labelBoxes:[],
    labelCounts:{place:0,poi:0,bss:0}
  };
}
function put(g,x,y,ch,cls,priority,feature=null,confidence=null){
  if(x<0||y<0||x>=CONFIG.gridW||y>=CONFIG.gridH)return;
  const cell=g.grid[y][x];
  if(priority>=cell.priority){
    cell.ch=ch;cell.cls=cls;cell.priority=priority;cell.feature=feature;cell.confidence=confidence;
  }
}
function putText(g,x,y,text,cls,priority,feature=null){
  for(let i=0;i<text.length;i++)put(g,x+i,y,text[i],cls,priority,feature);
}
function clippedMapLabel(value,maxLength){
  const clean=String(value||"").trim().replace(/\s+/g," ");
  if(!clean||maxLength<=0)return "";
  if(clean.length<=maxLength)return clean;
  return `${clean.slice(0,Math.max(1,maxLength-1)).trimEnd()}…`;
}
function labelQuota(kind){
  const p=semanticZoom();
  return kind==="place"?p.placeMax:kind==="bss"?p.bssMax:p.poiMax;
}
function labelBoxIntersects(a,b){
  return !(a.x2<b.x1||a.x1>b.x2||a.y2<b.y1||a.y1>b.y2);
}
function labelPositionFree(g,x,y,text,feature){
  if(!text||x<0||y<0||y>=CONFIG.gridH||x+text.length>CONFIG.gridW)return false;
  const box={x1:x-1,x2:x+text.length,y1:y,y2:y};
  if(g.labelBoxes.some(other=>labelBoxIntersects(box,other)))return false;
  for(let i=0;i<text.length;i++){
    const cell=g.grid[y][x+i];
    if(cell.priority>=16&&cell.feature!==feature)return false;
  }
  return true;
}
function tryMapLabel(g,anchor,value,cls,priority,feature,kind="poi",maxLength=0,centered=false){
  const quota=labelQuota(kind);
  if(quota<=0||g.labelCounts[kind]>=quota)return false;
  const label=clippedMapLabel(value,maxLength);
  if(!label)return false;
  const half=Math.floor(label.length/2);
  const candidates=centered
    ? [
        {x:anchor.x-half,y:anchor.y},
        {x:anchor.x-half,y:anchor.y+1},
        {x:anchor.x-half,y:anchor.y-1},
        {x:anchor.x+2,y:anchor.y}
      ]
    : [
        {x:anchor.x+3,y:anchor.y},
        {x:anchor.x-label.length-2,y:anchor.y},
        {x:anchor.x-half,y:anchor.y+1},
        {x:anchor.x-half,y:anchor.y-1}
      ];
  for(const pos of candidates){
    if(!labelPositionFree(g,pos.x,pos.y,label,feature))continue;
    putText(g,pos.x,pos.y,label,cls,priority,feature);
    g.labelBoxes.push({x1:pos.x-1,x2:pos.x+label.length,y1:pos.y,y2:pos.y});
    g.labelCounts[kind]++;
    return true;
  }
  return false;
}
function osmPlaceImportance(f){
  const p=f?.tags?.place;
  return p==="city"?100:p==="town"?90:p==="village"?80:p==="hamlet"?70:p==="suburb"?60:p==="neighbourhood"?55:40;
}
function bresenham(x0,y0,x1,y1,fn){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;
  let err=dx+dy;
  while(true){fn(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}
}
function pointInPolygon(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-12)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}
function polygonFill(g,points,ch,cls,priority,feature){
  if(points.length<3)return;
  const minX=clamp(Math.floor(Math.min(...points.map(p=>p.x))),0,CONFIG.gridW-1);
  const maxX=clamp(Math.ceil(Math.max(...points.map(p=>p.x))),0,CONFIG.gridW-1);
  const minY=clamp(Math.floor(Math.min(...points.map(p=>p.y))),0,CONFIG.gridH-1);
  const maxY=clamp(Math.ceil(Math.max(...points.map(p=>p.y))),0,CONFIG.gridH-1);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(pointInPolygon(x+.5,y+.5,points))put(g,x,y,ch,cls,priority,feature);
}
function lineDraw(g,points,ch,cls,priority,feature,width=1){
  for(let i=1;i<points.length;i++){
    bresenham(points[i-1].x,points[i-1].y,points[i].x,points[i].y,(x,y)=>{
      for(let oy=-Math.floor(width/2);oy<=Math.floor(width/2);oy++)
        for(let ox=-Math.floor(width/2);ox<=Math.floor(width/2);ox++)
          put(g,x+ox,y+oy,ch,cls,priority,feature);
    });
  }
}
function featureCenter(points){
  if(!points.length)return{x:0,y:0};
  return{x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};
}
function coordsIntersectExtent(feature,e){
  const b=feature.bbox;
  if(b)return !(b.east<e.west||b.west>e.east||b.north<e.south||b.south>e.north);
  return feature.coords.some(([lon,lat])=>inExtent(lat,lon,e));
}
function osmFeatureInfo(f,kind){
  return {kind,name:f.tags.name||"",source:"OpenStreetMap",tags:f.tags,id:f.id};
}
function clearVegetationAround(g,cx,cy,radiusMeters,feature){
  if(state.zoomIndex<2)return;
  const z=currentZoom();
  const cellW=z.widthKm*1000/CONFIG.gridW,cellH=z.heightKm*1000/CONFIG.gridH;
  const rx=Math.max(1,Math.ceil(radiusMeters/cellW));
  const ry=Math.max(1,Math.ceil(radiusMeters/cellH));
  for(let oy=-ry;oy<=ry;oy++)for(let ox=-rx;ox<=rx;ox++){
    if((ox*ox)/(rx*rx)+(oy*oy)/(ry*ry)>1)continue;
    const x=cx+ox,y=cy+oy;
    if(x<0||y<0||x>=CONFIG.gridW||y>=CONFIG.gridH)continue;
    const c=g.grid[y][x];
    if(c.cls==="c-forest"||c.cls==="c-scrub"){
      c.ch="░";c.cls="c-clearing";c.priority=3;c.feature=feature;
    }
  }
}
function softenVegetationNearBuilt(g){
  if(state.zoomIndex<2)return;
  const seeds=[];
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    if(g.grid[y][x].cls==="c-building")seeds.push([x,y]);
  }
  const seen=new Set();
  for(const [x,y] of seeds){
    const key=`${Math.round(x/2)}:${Math.round(y/2)}`;if(seen.has(key))continue;seen.add(key);
    clearVegetationAround(g,x,y,14,{kind:"abords bâtis dégagés",source:"inférence locale autour d’un bâtiment OpenStreetMap"});
  }
  const hp=coordToGrid(CONFIG.house.lat,CONFIG.house.lon,g.extent);
  clearVegetationAround(g,hp.x,hp.y,38,{kind:"emprise habitée dégagée",name:"autour de la maison",source:"correction de lecture fondée sur le repère d’habitation fourni par l’utilisateur"});
}
function renderCadastre(g){
  const detail=semanticZoom();
  if(!detail.cadastreBuildings&&!detail.parcels)return;
  const e=g.extent;
  if(state.layerParcels&&detail.parcels){
    for(const indexed of queryCadastreFeatures(e,"parcel")){
      const f=indexed.feature,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e));
      lineDraw(g,pts,"┄","c-parcel",4,{kind:"limite de parcelle cadastrale",name:f.id||f.properties?.id||"parcelle",id:f.id,source:"Cadastre Etalab / DGFiP"});
    }
  }
  if(state.layerCadastreBuildings&&detail.cadastreBuildings){
    for(const indexed of queryCadastreFeatures(e,"building")){
      const f=indexed.feature,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e));
      polygonFill(g,pts,"█","c-cad-building",12,{kind:"bâtiment cadastral",name:"Emprise bâtie officielle",id:f.id,source:"Cadastre Etalab / DGFiP",cadastre:true,properties:f.properties});
    }
  }
}
function drawBss(g){
  if(!state.layerBss||!state.bss.length||state.zoomIndex<1)return;
  const visible=queryNormalizedPois(g.extent,"bss");
  if(!visible.length)return;

  if(state.zoomIndex===1){
    const buckets=new Map();
    for(const poi of visible){
      const b=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent);
      const key=`${Math.floor(p.x/6)}:${Math.floor(p.y/4)}`;
      const bucket=buckets.get(key)||{items:[],pois:[],sx:0,sy:0};
      bucket.items.push(b);bucket.pois.push(poi);bucket.sx+=p.x;bucket.sy+=p.y;buckets.set(key,bucket);
    }
    for(const bucket of buckets.values()){
      const x=Math.round(bucket.sx/bucket.items.length),y=Math.round(bucket.sy/bucket.items.length);
      const piezo=bucket.items.some(b=>b.piezo),count=bucket.items.length;
      const info={
        kind:count>1?`groupe de ${count} ouvrages BSS`:piezo?"station piézométrique":"forage ou ouvrage BSS",
        name:count>1?`${count} ouvrages dans cette zone`:bucket.items[0].name,
        source:"BRGM · BSS Charente, regroupement visuel à cette échelle",
        bss:true,piezo,records:bucket.items,normalizedPois:bucket.pois,
        poi:true,poiCategory:"bss",poiSourceType:"bss",poiId:`bss-cluster:${x}:${y}`
      };
      putText(g,x,y,piezo?"P":count>1?"B+":"B",piezo?"c-piezo":"c-bss",17,info);
    }
    return;
  }

  const detail=semanticZoom();
  const ordered=visible.slice().sort((a,b)=>Number(!!b.raw?.piezo)-Number(!!a.raw?.piezo)||distanceMeters(state.center,a)-distanceMeters(state.center,b));
  for(const poi of ordered){
    const b=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent);
    const info=poiFeatureInfo(poi,{kind:b.piezo?"station piézométrique":"forage ou ouvrage BSS",depth:b.depth,nature:b.nature,altitude:b.altitude,commune:b.commune,indice:b.indice,place:b.place,bss:true,piezo:!!b.piezo});
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,b.piezo?"piezo":"bss");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",17,{kind:"indice documentaire proche",name:"Quelque chose mérite peut-être un examen",source:"Brouillard de connaissance"});continue}
    const glyph=b.piezo?"P≈":currentDepth()<0?"B│":"B•";
    putText(g,p.x,p.y,glyph,b.piezo?"c-piezo":"c-bss",17,info);
    if(currentDepth()===0&&state.layerLabels&&detail.bssLabel>0){
      const label=state.zoomIndex>=5?(b.indice||b.name||b.id):(b.indice||b.name||"BSS");
      tryMapLabel(g,p,label,"c-label",14,info,"bss",detail.bssLabel,false);
    }
  }
}
function drawObservations(g){
  if(!state.layerObservations||currentDepth()!==0)return;
  const detailedGeometry=semanticZoom().observationGeometry;
  for(const poi of queryNormalizedPois(g.extent,"observation")){
    const o=poi.raw;
    const info=poiFeatureInfo(poi,{kind:o.mode==="sight"?"ligne de visée observée":"zone d’observation approximative",observation:true,confidenceLabel:confidenceLabel(o.confidence),season:o.season||"",bearing:o.bearing,distance:o.distance});
    const p=coordToGrid(poi.lat,poi.lon,g.extent),visibility=explorerMarkerState(info,poi.lat,poi.lon,"observation");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",19,{kind:"indice d’observation proche",name:"Une observation reste à révéler",source:"Brouillard de connaissance"});continue}
    if(o.mode==="sight"){
      if(detailedGeometry){
        const a=coordToGrid(CONFIG.house.lat,CONFIG.house.lon,g.extent);let n=0;
        bresenham(a.x,a.y,p.x,p.y,(x,y)=>{if(n++%2===0)put(g,x,y,"·","c-sight",15,info,o.confidence)});
      }
      put(g,p.x,p.y,"▷","c-observation",19,info,o.confidence);
    }else if(o.mode==="zone"){
      if(detailedGeometry){
        const z=currentZoom(),rx=Math.max(1,Math.round((o.radius||80)/(z.widthKm*1000/CONFIG.gridW))),ry=Math.max(1,Math.round((o.radius||80)/(z.heightKm*1000/CONFIG.gridH)));
        for(let i=0;i<72;i++){const a=i/72*Math.PI*2,x=p.x+Math.round(Math.cos(a)*rx),y=p.y+Math.round(Math.sin(a)*ry);put(g,x,y,"·","c-zone",15,info,o.confidence)}
      }
      put(g,p.x,p.y,"◎","c-observation",19,info,o.confidence);
    }
  }
}

function drawCartofriches(g){
  if(!state.layerCartofriches||currentDepth()!==0||!state.cartofriches.length)return;
  for(const poi of queryNormalizedPois(g.extent,"cartofriches")){
    const f=poi.raw;
    if(!state.cartofrichesIncludeReconverted&&(f.status||"").toLowerCase().includes("reconvert"))continue;
    const m=cartofrichesMarker(f),p=coordToGrid(poi.lat,poi.lon,g.extent);
    const info=poiFeatureInfo(poi,{
      kind:m.label,cartofriches:true,siteType:f.type,siteStatus:f.status,address:f.address,surface:f.surface,
      occupation:f.occupation,activity:f.activity,activityEnd:f.activityEnd,updated:f.updated,
      identified:f.identified,commune:f.commune,insee:f.insee,producer:f.producer,
      sourceNature:f.sourceNature,url:f.url,security:f.security,pollution:f.pollution
    });
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"cartofriches");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",22,{kind:"friche officielle proche",name:"Un site Cartofriches reste à identifier",source:"Brouillard de connaissance"});continue}
    putText(g,p.x,p.y,m.glyph,m.cls,22,info);
    const detail=semanticZoom();
    if(state.layerLabels&&detail.poiLabel>0&&f.name)tryMapLabel(g,p,f.name,"c-label",14,info,"poi",detail.poiLabel,false);
  }
}

function drawOfflineDemoPoints(g){
  if(!OFFLINE_TEST||currentDepth()!==0||state.cartofriches.length||state.loreItems.length||state.localCavities.length)return;
  for(const poi of queryNormalizedPois(g.extent,"demo")){
    const d=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent);
    const info=poiFeatureInfo(poi,{kind:d.kind,note:d.note,source:"Démonstration embarquée · donnée synthétique, non géographique",demo:true});
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"demo");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",21,{kind:"indice de démonstration",name:"Une balise de test est proche",source:"Démonstration embarquée"});continue}
    putText(g,p.x,p.y,d.glyph,"c-demo",21,info);
  }
}


function drawHeritage(g){
  if(!state.layerHeritage||currentDepth()!==0)return;
  const visible=queryNormalizedPois(g.extent,"heritage").filter(p=>state.heritageEnabled[p.raw?.category]!==false);
  if(!visible.length)return;
  if(state.zoomIndex<=1){
    const stepX=state.zoomIndex===0?9:6,stepY=state.zoomIndex===0?5:4,buckets=new Map();
    for(const poi of visible){const p=coordToGrid(poi.lat,poi.lon,g.extent),key=`${Math.floor(p.x/stepX)}:${Math.floor(p.y/stepY)}`,b=buckets.get(key)||{items:[],pois:[],sx:0,sy:0};b.items.push(poi.raw);b.pois.push(poi);b.sx+=p.x;b.sy+=p.y;buckets.set(key,b)}
    for(const b of buckets.values()){
      const x=Math.round(b.sx/b.items.length),y=Math.round(b.sy/b.items.length),single=b.items.length===1?b.items[0]:null,singlePoi=b.pois.length===1?b.pois[0]:null,d=heritageMarkerDefinition(single?.category||"monument");
      const info=singlePoi?poiFeatureInfo(singlePoi,heritageFeatureInfo(single)):{kind:`groupe de ${b.items.length} lieux patrimoniaux`,name:`${b.items.length} lieux documentés dans cette zone`,source:"Regroupement visuel de plusieurs sources patrimoniales",heritage:true,records:b.items,normalizedPois:b.pois,poi:true,poiCategory:"heritage",poiSourceType:"heritage",poiId:`heritage-cluster:${x}:${y}`};
      putText(g,x,y,single?d.glyph:"P+",single?d.cls:"c-heritage-monument",21,info);
    }
    return;
  }
  const ordered=visible.slice().sort((a,b)=>heritagePriority(b.raw)-heritagePriority(a.raw));
  for(const poi of ordered){
    const item=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent),d=heritageMarkerDefinition(item.category),info=poiFeatureInfo(poi,heritageFeatureInfo(item));
    putText(g,p.x,p.y,d.glyph,d.cls,heritagePriority(item),info);
    const detail=semanticZoom();if(state.layerLabels&&detail.poiLabel>0&&item.name)tryMapLabel(g,p,item.name,"c-label",15,info,"poi",detail.poiLabel,false);
  }
}
function heritagePriority(item){return item.category==="monument"?23:item.category==="garden"?22:item.category==="house"||item.category==="museum"?21:19}
function heritageFeatureInfo(item){
  const d=heritageMarkerDefinition(item.category);
  return {id:item.id,kind:d.label,name:item.name,source:item.source,heritage:true,heritageCategory:item.category,reference:item.ref||item.wikidata||"",description:item.description||item.wikipediaDescription||"",period:item.period||"",protection:item.protection||"",commune:item.commune||"",address:item.address||"",url:item.url||item.wikipediaUrl||"",license:item.license||"",record:item,lat:item.lat,lon:item.lon};
}

function drawLore(g){
  if(!state.layerLore||currentDepth()!==0||!state.loreItems.length)return;
  for(const poi of queryNormalizedPois(g.extent,"lore")){
    const item=poi.raw,p=coordToGrid(poi.lat,poi.lon,g.extent),def=loreMarkerDefinition(item.category);
    const info=poiFeatureInfo(poi,{
      kind:def.label,source:item.source||"Repère local enregistré dans cet atlas",
      lore:true,category:item.category,categoryLabel:def.label,period:item.period||"",note:item.note||""
    });
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"lore");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",20,{kind:"lieu intrigant à proximité",name:"Un détail du paysage attire l’attention",source:"Brouillard de connaissance"});continue}
    putText(g,p.x,p.y,def.glyph,def.cls,20,info);
    const detail=semanticZoom();
    if(state.layerLabels&&detail.poiLabel>0&&item.name)tryMapLabel(g,p,item.name,"c-label",14,info,"poi",detail.poiLabel,false);
  }
}

function renderSurface(g){
  if(state.osm){
    const z=currentZoom(), e=g.extent;
    const features=queryOsmFeatures(e);
    const polygons=[],lines=[],labels=[];
    for(const f of features){
      const t=f.tags;
      if(t.place){labels.push(f);continue}
      if(t.building){polygons.push({f,kind:"building"});continue}
      if(t.landuse||["wood","water","scrub"].includes(t.natural)){polygons.push({f,kind:"land"});continue}
      if(t.waterway||t.highway||t.natural==="cliff"){lines.push(f);continue}
      if(t.natural==="spring"||t.natural==="sinkhole"||t.natural==="cave_entrance"){labels.push(f)}
    }
    for(const item of polygons){
      const f=item.f,t=f.tags,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e));
      if(item.kind==="building"){
        if(!semanticZoom().osmBuildings)continue;
        polygonFill(g,pts,"█","c-building",9,osmFeatureInfo(f,"bâtiment"));
      }else{
        if(!f.closed){
          lineDraw(g,pts,"·","c-contour",2,osmFeatureInfo(f,"limite de terrain"));
          continue;
        }
        let ch=".",cls="c-field",pri=1,kind="terrain";
        const lu=t.landuse,n=t.natural,detail=semanticZoom();
        if(!detail.fineLand&&(["meadow","grass","farmland","orchard","vineyard"].includes(lu)||n==="scrub"))continue;
        if(lu==="forest"||n==="wood"){ch="T";cls="c-forest";kind="bois";pri=1}
        else if(["meadow","grass"].includes(lu)){ch=",";cls="c-meadow";kind="prairie";pri=1}
        else if(["farmland","orchard","vineyard"].includes(lu)){ch=".";cls="c-field";kind=lu;pri=1}
        else if(lu==="residential"||lu==="industrial"){ch="░";cls="c-residential";kind=lu;pri=3}
        else if(lu==="quarry"){ch="q";cls="c-quarry";kind="carrière à ciel ouvert";pri=4}
        else if(n==="water"){ch="~";cls="c-water";kind="surface d’eau";pri=5}
        else if(n==="scrub"){ch='"';cls="c-scrub";kind="broussailles"}
        else if(lu==="cemetery"){ch="†";cls="c-residential";kind="cimetière"}
        polygonFill(g,pts,ch,cls,pri,osmFeatureInfo(f,kind));
      }
    }
    for(const f of lines){
      const t=f.tags,pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e)),detail=semanticZoom();
      if(t.waterway){
        const majorWater=t.waterway==="river"||t.waterway==="canal";
        if(!majorWater&&!detail.minorWater)continue;
        // Une largeur en cellules ne doit pas être constante quand chaque case
        // représente de 100 m à moins de 2 m. Loin du terrain, même une rivière
        // reste un fil ; le double trait n’apparaît qu’aux zooms réellement proches.
        const waterWidth=majorWater&&state.zoomIndex>=4?2:1;
        const waterGlyph=state.zoomIndex<=1?"~":"≈";
        lineDraw(g,pts,waterGlyph,"c-water",8,osmFeatureInfo(f,t.waterway),waterWidth);
      }
      else if(t.natural==="cliff"){
        if(state.zoomIndex===0)continue;
        lineDraw(g,pts,"|","c-contour",6,osmFeatureInfo(f,"escarpement"),1);
      }
      else if(t.highway){
        const motorway=["motorway","motorway_link","trunk","trunk_link"].includes(t.highway);
        const arterial=["primary","primary_link","secondary","secondary_link"].includes(t.highway);
        const major=motorway||arterial;
        const path=["track","path","footway","cycleway","bridleway","steps"].includes(t.highway);
        if(path&&!detail.paths)continue;
        if(!major&&!path&&!detail.minorRoads)continue;
        /* Une route reste toujours un trait d’une cellule. À grande échelle, la
           hiérarchie est portée par le glyphe et la teinte, jamais par une largeur
           de trois cellules qui transformerait une départementale en ruban géant. */
        let roadGlyph="─",roadClass="c-road",roadPriority=7;
        if(path){roadGlyph="·";roadClass="c-path";roadPriority=5}
        else if(motorway){
          roadGlyph=state.zoomIndex>=4?"═":state.zoomIndex>=2?"━":"─";
          roadClass=state.zoomIndex<=1?"c-road-major c-road-far":"c-road-major";
          roadPriority=8;
        }else if(arterial){
          roadGlyph=state.zoomIndex>=3?"━":"─";
          roadClass=state.zoomIndex===0?"c-road c-road-far":"c-road-major";
          roadPriority=8;
        }
        lineDraw(g,pts,roadGlyph,roadClass,roadPriority,osmFeatureInfo(f,`voie ${t.highway}`),1);
      }
    }
    softenVegetationNearBuilt(g);
    if(state.layerLabels){
      const detail=semanticZoom();
      const ordered=labels.slice().sort((a,b)=>osmPlaceImportance(b)-osmPlaceImportance(a));
      for(const f of ordered){
        const name=f.tags.name;if(!name)continue;
        const isPlace=!!f.tags.place;
        if(isPlace&&detail.placeTypes&&!detail.placeTypes.has(f.tags.place))continue;
        if(!isPlace&&detail.poiLabel<=0)continue;
        const pts=f.coords.map(([lon,lat])=>coordToGrid(lat,lon,e)),c=featureCenter(pts);
        const anchor={x:Math.round(c.x),y:Math.round(c.y)};
        const importance=isPlace?Math.max(10,Math.round(osmPlaceImportance(f)/7)):12;
        tryMapLabel(
          g,anchor,name,"c-label",importance,osmFeatureInfo(f,isPlace?"nom de lieu":"point naturel OSM"),
          isPlace?"place":"poi",isPlace?detail.placeLabel:detail.poiLabel,true
        );
      }
    }
  }else if(state.zoomIndex===3 && (OFFLINE_TEST || (Math.abs(state.center.lat-CONFIG.house.lat)<.002 && Math.abs(state.center.lon-CONFIG.house.lon)<.003))){
    const sourceH=FALLBACK_SURFACE.length,sourceW=Math.max(...FALLBACK_SURFACE.map(row=>row.length));
    for(let y=0;y<CONFIG.gridH;y++){
      const sy=clamp(Math.round((y/Math.max(1,CONFIG.gridH-1))*(sourceH-1)),0,sourceH-1);
      const src=FALLBACK_SURFACE[sy]||"";
      for(let x=0;x<CONFIG.gridW;x++){
        const sx=clamp(Math.round((x/Math.max(1,CONFIG.gridW-1))*(sourceW-1)),0,Math.max(0,src.length-1));
        const ch=src[sx]||" ";
        if(ch===".")put(g,x,y,ch,"c-field",1,{kind:"surface de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch===";")put(g,x,y,ch,"c-forest",1,{kind:"végétation de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch==="~")put(g,x,y,ch,"c-water",8,{kind:"eau de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch==="=")put(g,x,y,ch,"c-road",7,{kind:"voie de secours",source:"capture cartographique V0.1 rééchantillonnée"});
        else if(ch==="#")put(g,x,y,ch,"c-building",9,{kind:"bâtiment de secours",source:"capture cartographique V0.1 rééchantillonnée"});
      }
    }
  }
  renderCadastre(g);
  if(state.layerHouse){
    const p=coordToGrid(CONFIG.house.lat,CONFIG.house.lon,g.extent);
    const source=state.houseBuilding?"centre d’un bâtiment du Cadastre Etalab, rapproché du point BAN":state.address?"Géoplateforme / Base Adresse Nationale":"repère de secours ou réglage manuel";
    ensureSpatialIndexes();
    const housePoi=spatialRuntime.normalizedPois.find(v=>v.sourceType==="house");
    put(g,p.x,p.y,"@","c-house",24,housePoi?poiFeatureInfo(housePoi,{kind:"maison",source,address:state.address?.label||"",cadastreBuilding:state.houseBuilding?.id||""}):{kind:"maison",name:"42 rue de la Falaise",source,address:state.address?.label||"",cadastreBuilding:state.houseBuilding?.id||""});
  }
}

function applyRelief(g){
  if(!state.layerRelief||!state.elevation)return;
  const range=(g.maxE??0)-(g.minE??0);
  for(let y=0;y<CONFIG.gridH;y++){
    for(let x=0;x<CONFIG.gridW;x++){
      const c=g.grid[y][x],v=c.elev;
      if(Number.isFinite(v)&&range>0)c.shade=Math.round((v-g.minE)/range*7);
    }
  }
  const step=currentZoom().contour;
  for(let y=1;y<CONFIG.gridH-1;y++){
    for(let x=1;x<CONFIG.gridW-1;x++){
      const v=g.elevations[y][x],r=g.elevations[y][x+1],d=g.elevations[y+1][x];
      if(!Number.isFinite(v)||!Number.isFinite(r)||!Number.isFinite(d))continue;
      const crossing=Math.floor(v/step)!==Math.floor(r/step)||Math.floor(v/step)!==Math.floor(d/step);
      if(crossing&&g.grid[y][x].priority<=2)put(g,x,y,"·","c-contour",3,{kind:`courbe de niveau ${Math.round(v/step)*step} m`,source:`relief ${state.elevation?.source||"modèle altimétrique"}`});
    }
  }
}

function cavityMarker(c){
  const type=cavityType(c),full=`${type} ${text(c?.detail)} ${cavityName(c)}`.toLowerCase();
  if(c?.markerOverride){
    const def=localMarkerDefinition(c.markerOverride);
    return {glyph:c.markerOverride,cls:c.local?"c-doc-local":def.cls,label:def.detail};
  }
  if(type.includes("ouvrage civil"))return {glyph:"O=",cls:"c-doc-civil",label:"ouvrage civil"};
  if(type.includes("puits"))return {glyph:"Av",cls:"c-doc-anthropic",label:"puits anthropique"};
  if(type.includes("galerie")||type.includes("souterrain"))return {glyph:"A=",cls:"c-doc-anthropic",label:"galerie ou souterrain"};
  if(type.includes("carri"))return {glyph:"A#",cls:"c-doc-anthropic",label:"carrière souterraine"};
  if(type.includes("nature")){
    if(/résurgence|source|rivière/.test(full))return {glyph:"Ns",cls:"c-doc-natural",label:"résurgence ou circulation naturelle"};
    if(/aven|gouffre|vertical/.test(full))return {glyph:"Nv",cls:"c-doc-natural",label:"accès naturel vertical"};
    if(/horizontal|entrée/.test(full))return {glyph:"N>",cls:"c-doc-natural",label:"accès naturel horizontal"};
    return {glyph:"No",cls:"c-doc-natural",label:"cavité naturelle, morphologie d’entrée non précisée"};
  }
  if(type.includes("cave"))return {glyph:"Ac",cls:"c-doc-anthropic",label:"cave anthropique"};
  return {glyph:"?o",cls:"c-doc-unknown",label:"cavité de type insuffisamment précisé"};
}
function cavityInfo(c,marker){
  const o=c.observation||{};
  return {
    kind:marker.label,name:cavityName(c),id:c.id,source:c.source,type:cavityType(c),detail:c.detail,
    precision:c.precision,position:c.position,altitude:c.altitude,comments:c.comments,
    lat:c.lat,lon:c.lon,cavity:true,record:c,local:!!c.local,osm:!!c.osm,commune:c.commune||"",
    observation:!!c.local,confidenceLabel:o.confidence?confidenceLabel(o.confidence):"",season:o.season||"",
    bearing:o.bearing,distance:o.distance
  };
}
function drawCavities(g){
  if(!state.layerCavities||!state.cavities.length)return;
  const depth=currentDepth();
  for(const poi of queryNormalizedPois(g.extent,"cavity")){
    const c=poi.raw;
    if(c.local&&!state.layerObservations)continue;
    const p=coordToGrid(poi.lat,poi.lon,g.extent),m=cavityMarker(c),info=poiFeatureInfo(poi,cavityInfo(c,m));
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"cavity");
    if(visibility==="hidden")continue;
    if(visibility==="hint"){put(g,p.x,p.y,"?","c-explorer-hint",18,{kind:"anomalie souterraine proche",name:"Un repère reste à identifier",source:"Brouillard de connaissance"});continue}
    putText(g,p.x,p.y,m.glyph,m.cls,18,info);
    const detail=semanticZoom();
    if(depth===0&&state.layerLabels&&detail.poiLabel>0)tryMapLabel(g,p,c.name||"","c-label",14,info,"poi",detail.poiLabel,false);
  }
}

function drawUserLocation(g){
  const loc=state.userLocation;if(!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lon)||!inExtent(loc.lat,loc.lon,g.extent))return;
  ensureSpatialIndexes();
  const poi=spatialRuntime.normalizedPois.find(p=>p.sourceType==="location");
  const p=coordToGrid(loc.lat,loc.lon,g.extent),z=currentZoom();
  const metersPerCell=Math.max(1,((z.widthKm*1000/CONFIG.gridW)+(z.heightKm*1000/CONFIG.gridH))/2);
  const radius=clamp(Math.round((Number(loc.accuracy)||0)/metersPerCell),0,6);
  if(radius>=2){
    const points=Math.max(12,radius*8);
    for(let i=0;i<points;i++){
      const a=i/points*Math.PI*2,x=Math.round(p.x+Math.cos(a)*radius),y=Math.round(p.y+Math.sin(a)*radius);
      put(g,x,y,"·","c-user-accuracy",5,{kind:"incertitude GPS",name:`Précision approximative ± ${Math.round(loc.accuracy)} m`,source:"Géolocalisation ponctuelle du navigateur"});
    }
  }
  put(g,p.x,p.y,"⌖","c-user-position",50,poi?poiFeatureInfo(poi,{accuracy:loc.accuracy,timestamp:loc.timestamp}):{
    kind:"position actuelle",name:"Ma position",source:"Géolocalisation ponctuelle du navigateur",
    lat:loc.lat,lon:loc.lon,accuracy:loc.accuracy,timestamp:loc.timestamp
  });
}

function hashString(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function scenarioFactor(){return state.scenario==="prudent"?0.72:state.scenario==="extensive"?1.35:1}
const hypothesisModelCache=new Map();
function hypothesisDepthProfile(c){
  const type=cavityType(c),measured=documentedCavityDepth(c);
  if(Number.isFinite(measured)){
    const half=type.includes("ouvrage civil")?3:type.includes("carri")?7:10;
    return {top:Math.min(-.5,measured+half),bottom:measured-half,core:measured,documented:true,basis:"profondeur fournie par la notice"};
  }
  if(type.includes("ouvrage civil")||type.includes("galerie")||type.includes("souterrain"))return {top:-1,bottom:state.scenario==="extensive"?-14:-10,core:-4,documented:false,basis:"enveloppe générique d’ouvrage peu profond"};
  if(type.includes("carri")){
    if(state.scenario==="prudent")return {top:-5,bottom:-20,core:-12,documented:false,basis:"enveloppe prudente de carrière"};
    if(state.scenario==="extensive")return {top:-3,bottom:-45,core:-18,documented:false,basis:"enveloppe extensive de carrière"};
    return {top:-4,bottom:-30,core:-14,documented:false,basis:"enveloppe générique de carrière"};
  }
  if(type.includes("nature")){
    if(state.scenario==="prudent")return {top:-3,bottom:-27,core:-13,documented:false,basis:"enveloppe prudente de cavité naturelle"};
    if(state.scenario==="extensive")return {top:-1,bottom:-50,core:-22,documented:false,basis:"enveloppe extensive de cavité naturelle"};
    return {top:-2,bottom:-40,core:-18,documented:false,basis:"enveloppe générique de cavité naturelle"};
  }
  return {top:-4,bottom:-20,core:-11,documented:false,basis:"enveloppe générique, type insuffisamment documenté"};
}
function depthStrength(c,depth){
  const p=hypothesisDepthProfile(c);
  if(depth>p.top||depth<p.bottom)return 0;
  const radius=Math.max(1,(p.top-p.bottom)/2),distance=Math.abs(depth-p.core)/radius;
  return clamp(1-distance*.55,.28,1);
}
function offsetToCoord(origin,xMeters,yMeters){return {lat:origin.lat+yMeters/111320,lon:origin.lon+xMeters/(kmPerLon(origin.lat)*1000)}}
function offsetToGrid(origin,xMeters,yMeters,extent){const c=offsetToCoord(origin,xMeters,yMeters);return coordToGrid(c.lat,c.lon,extent)}
function rotatedPoint(cx,cy,x,y,angle){const ca=Math.cos(angle),sa=Math.sin(angle);return {x:cx+x*ca-y*sa,y:cy+x*sa+y*ca}}
function rectangleWorld(cx,cy,w,h,angle){return [rotatedPoint(cx,cy,-w/2,-h/2,angle),rotatedPoint(cx,cy,w/2,-h/2,angle),rotatedPoint(cx,cy,w/2,h/2,angle),rotatedPoint(cx,cy,-w/2,h/2,angle)]}
function circleWorld(cx,cy,r,steps=18){return Array.from({length:steps},(_,i)=>{const a=i/steps*Math.PI*2;return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}})}
function hypothesisConfidence(index,total){const t=total<=1?0:index/(total-1);return t<.34?"high":t<.72?"med":"low"}
function confidenceGlyph(conf){return conf==="high"?"▓":conf==="med"?"▒":"░"}
function confidenceClass(conf){return `c-hyp-${conf}`}
function hypothesisInfo(c,kind,model){
  const profile=model.profile||hypothesisDepthProfile(c),slice=depthSliceMeta(model.depth);
  return {kind,name:c.name,source:profile.documented?"projection stable calée sur une profondeur déclarée":"projection interprétative stable · profondeur locale non mesurée",cavity:c,hypothesisModel:model.key,depthStatus:profile.documented?`profondeur de référence ${Math.abs(profile.core)} m`:`${slice.label} · ${slice.range}`,comments:`Empreinte horizontale commune aux différentes coupes. ${profile.basis}. Les variations entre niveaux correspondent au même volume vertical, pas à de nouvelles galeries générées.`};
}
function expandModelBounds(model,p){model.bounds.minX=Math.min(model.bounds.minX,p.x);model.bounds.maxX=Math.max(model.bounds.maxX,p.x);model.bounds.minY=Math.min(model.bounds.minY,p.y);model.bounds.maxY=Math.max(model.bounds.maxY,p.y)}
function finalizeHypothesisModel(model){
  model.bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(const poly of model.polygons)for(const p of poly.points)expandModelBounds(model,p);
  for(const line of model.lines)for(const p of line.points)expandModelBounds(model,p);
  for(const point of model.points)expandModelBounds(model,point);
  if(!Number.isFinite(model.bounds.minX))model.bounds={minX:-5,maxX:5,minY:-5,maxY:5};
  return model;
}
function buildQuarryModel(model,c,rnd,scale){
  const sizeScale=clamp(scale,.6,1.45),rooms=clamp(Math.round((4+rnd()*3)*sizeScale),2,9),mainAngle=rnd()*Math.PI*2;
  let cx=0,cy=0,previous={x:0,y:0};
  for(let i=0;i<rooms;i++){
    const conf=hypothesisConfidence(i,rooms),roomAngle=mainAngle+(rnd()-.5)*.30;
    if(i>0){const advance=(24+rnd()*22)*sizeScale,drift=(rnd()-.5)*16*sizeScale;cx+=Math.cos(mainAngle)*advance-Math.sin(mainAngle)*drift;cy+=Math.sin(mainAngle)*advance+Math.cos(mainAngle)*drift;model.lines.push({points:[previous,{x:cx,y:cy}],glyph:"=",conf:"med",kind:"galerie de liaison"})}
    const w=(22+rnd()*30)*sizeScale,h=(11+rnd()*17)*sizeScale;
    model.polygons.push({points:rectangleWorld(cx,cy,w,h,roomAngle),conf,kind:"salle de carrière extrapolée",edge:"#"});
    if(w>27&&h>15){const cols=Math.max(1,Math.floor(w/15)),rows=Math.max(1,Math.floor(h/11));for(let ix=1;ix<=cols;ix++)for(let iy=1;iy<=rows;iy++){const lx=-w/2+ix*w/(cols+1),ly=-h/2+iy*h/(rows+1),pillar=rotatedPoint(cx,cy,lx,ly,roomAngle);model.points.push({...pillar,glyph:"O",conf:"high",kind:"pilier supposé"})}}
    previous={x:cx,y:cy};
  }
  if(state.scenario!=="prudent"){const spurAngle=mainAngle+(rnd()<.5?-1:1)*(.45+rnd()*.55),len=(45+rnd()*75)*sizeScale;model.lines.push({points:[previous,{x:previous.x+Math.cos(spurAngle)*len,y:previous.y+Math.sin(spurAngle)*len}],glyph:"·",conf:"low",kind:"prolongement très incertain",dashed:true})}
}
function buildNaturalModel(model,c,rnd,scale){
  const sizeScale=clamp(scale,.6,1.5),segments=clamp(Math.round((24+rnd()*18)*sizeScale),14,64);let angle=rnd()*Math.PI*2,x=0,y=0;
  for(let i=0;i<segments;i++){if(rnd()<.32)angle+=(rnd()-.5)*1.15;else angle+=(rnd()-.5)*.24;const step=(5+rnd()*5)*sizeScale,next={x:x+Math.cos(angle)*step,y:y+Math.sin(angle)*step},conf=hypothesisConfidence(i,segments);model.lines.push({points:[{x,y},next],glyph:confidenceGlyph(conf),conf,kind:"conduit naturel extrapolé"});x=next.x;y=next.y;if(rnd()<.11){const radius=(6+rnd()*10)*sizeScale;model.polygons.push({points:circleWorld(x,y,radius,18),conf:"med",kind:"élargissement naturel supposé",edge:"·"})}}
  if(state.layerHydrology){const waterAngle=angle+(rnd()-.5)*.5,len=(40+rnd()*55)*sizeScale;model.lines.push({points:[{x,y},{x:x+Math.cos(waterAngle)*len,y:y+Math.sin(waterAngle)*len}],glyph:"≈",conf:"low",kind:"écoulement souterrain supposé",water:true})}
}
function buildCivilModel(model,c,rnd,scale){
  const sizeScale=clamp(scale,.65,1.45),angle=rnd()*Math.PI*2,length=(75+rnd()*135)*sizeScale,end={x:Math.cos(angle)*length,y:Math.sin(angle)*length};model.lines.push({points:[{x:0,y:0},end],glyph:"=",conf:"high",kind:"ouvrage linéaire extrapolé"});
  if(state.scenario!=="prudent"){const branchAt=.35+rnd()*.35,base={x:end.x*branchAt,y:end.y*branchAt},branchAngle=angle+(rnd()<.5?-1:1)*(.65+rnd()*.55),branchLength=(35+rnd()*70)*sizeScale;model.lines.push({points:[base,{x:base.x+Math.cos(branchAngle)*branchLength,y:base.y+Math.sin(branchAngle)*branchLength}],glyph:"·",conf:"low",kind:"branche secondaire supposée",dashed:true})}
}
function assignVerticalEnvelope(model,c,rnd){
  const profile=model.profile,type=cavityType(c),nominalHalf=profile.documented?Math.max(2,(profile.top-profile.bottom)/2):type.includes("ouvrage civil")?4:type.includes("carri")?9:16;
  for(const item of [...model.polygons,...model.lines,...model.points]){
    const confFactor=item.conf==="low"?.72:item.conf==="med"?.9:1,waterShift=item.water?-8:0,center=clamp(profile.core+waterShift+(rnd()-.5)*(type.includes("nature")?5:2.5),profile.bottom+1,profile.top-1),half=Math.max(2,nominalHalf*confFactor*(item.water?.8:1));
    item.zTop=Math.min(profile.top,center+half);item.zBottom=Math.max(profile.bottom,center-half);
    if(item.water){item.zTop=Math.min(item.zTop,-18);item.zBottom=Math.max(profile.bottom,Math.min(item.zBottom,-45))}
  }
}
function getHypothesisMaster(c){
  const profile=hypothesisDepthProfile(c),key=`master:${c.id}:${state.scenario}:${state.layerHydrology?1:0}`;
  if(hypothesisModelCache.has(key))return hypothesisModelCache.get(key);
  const rnd=mulberry32(hashString(key)),scale=scenarioFactor(),model={key,depth:null,scale,profile,polygons:[],lines:[],points:[],bounds:{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}},type=cavityType(c);
  if(type.includes("carri"))buildQuarryModel(model,c,rnd,scale);else if(type.includes("ouvrage civil")||type.includes("galerie")||type.includes("souterrain"))buildCivilModel(model,c,rnd,scale);else buildNaturalModel(model,c,rnd,scale);
  assignVerticalEnvelope(model,c,rnd);finalizeHypothesisModel(model);hypothesisModelCache.set(key,model);return model;
}
function getHypothesisModel(c,depth){
  if(!depthStrength(c,depth))return null;
  const master=getHypothesisMaster(c),key=`slice:${master.key}:${depth}`;
  if(hypothesisModelCache.has(key))return hypothesisModelCache.get(key);
  const visible=item=>depth<=item.zTop&&depth>=item.zBottom,model={key,depth,scale:master.scale,profile:master.profile,polygons:master.polygons.filter(visible),lines:master.lines.filter(visible),points:master.points.filter(visible),bounds:{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}};
  if(!model.polygons.length&&!model.lines.length&&!model.points.length)return null;
  finalizeHypothesisModel(model);hypothesisModelCache.set(key,model);return model;
}
function hypothesisModelIntersects(c,model,e){
  const sw=offsetToCoord(c,model.bounds.minX,model.bounds.minY);
  const ne=offsetToCoord(c,model.bounds.maxX,model.bounds.maxY);
  return !(ne.lon<e.west||sw.lon>e.east||ne.lat<e.south||sw.lat>e.north);
}
function drawWorldLine(g,c,line,info){
  const pts=line.points.map(p=>offsetToGrid(c,p.x,p.y,g.extent));
  const cls=line.water?"c-water-underground":confidenceClass(line.conf);
  if(line.dashed){
    for(let i=1;i<pts.length;i++){
      let n=0;
      bresenham(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,(x,y)=>{
        if(n++%2===0)put(g,x,y,line.glyph,cls,12,info,line.conf);
      });
    }
  }else{
    lineDraw(g,pts,line.glyph,cls,12,info,1);
    for(const p of pts)put(g,p.x,p.y,line.glyph,cls,12,info,line.conf);
  }
}
function drawWorldPolygon(g,c,poly,info){
  const pts=poly.points.map(p=>offsetToGrid(c,p.x,p.y,g.extent));
  const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
  const minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
  const cls=confidenceClass(poly.conf),glyph=confidenceGlyph(poly.conf);
  if(maxX-minX<1&&maxY-minY<1){
    const center=offsetToGrid(c,
      poly.points.reduce((s,p)=>s+p.x,0)/poly.points.length,
      poly.points.reduce((s,p)=>s+p.y,0)/poly.points.length,
      g.extent
    );
    put(g,center.x,center.y,glyph,cls,12,info,poly.conf);
    return;
  }
  polygonFill(g,pts,glyph,cls,11,info);
  lineDraw(g,[...pts,pts[0]],poly.edge||"#","c-wall",13,info,1);
}
function drawHypothesisModel(g,c,model){
  const generic=hypothesisInfo(c,"réseau souterrain extrapolé",model);
  for(const poly of model.polygons){
    drawWorldPolygon(g,c,poly,{...generic,kind:poly.kind});
  }
  for(const line of model.lines){
    drawWorldLine(g,c,line,{...generic,kind:line.kind});
  }
  for(const point of model.points){
    const p=offsetToGrid(c,point.x,point.y,g.extent);
    put(g,p.x,p.y,point.glyph||"O","c-pillar",15,{...generic,kind:point.kind},point.conf);
  }

  // At very coarse scales, draw the bounds of the same model if every detail
  // collapses into too few cells. This is a simplification of the same geometry,
  // not a second hypothesis.
  if(state.zoomIndex<=1){
    const corners=[
      {x:model.bounds.minX,y:model.bounds.minY},
      {x:model.bounds.maxX,y:model.bounds.minY},
      {x:model.bounds.maxX,y:model.bounds.maxY},
      {x:model.bounds.minX,y:model.bounds.maxY}
    ].map(p=>offsetToGrid(c,p.x,p.y,g.extent));
    const w=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x));
    const h=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));
    if(w>=2||h>=2)lineDraw(g,[...corners,corners[0]],"░","c-hyp-low",10,{...generic,kind:"emprise simplifiée du même modèle"},1);
  }
}
function drawHypotheses(g){
  const depth=currentDepth();
  if(depth===0||!state.layerHypothesis||!state.cavities.length)return;
  const searchExtent=expandExtentBox(g.extent,1.7);
  for(const poi of queryNormalizedPois(searchExtent,"cavity")){
    const c=poi.raw;
    if(c.local&&!state.layerObservations)continue;
    const marker=cavityMarker(c),info=poiFeatureInfo(poi,cavityInfo(c,marker));
    const visibility=explorerMarkerState(info,poi.lat,poi.lon,"cavity");
    if(visibility!=="known")continue;
    const model=getHypothesisModel(c,depth);
    if(!model||!hypothesisModelIntersects(c,model,g.extent))continue;
    drawHypothesisModel(g,c,model);
  }
  if(state.scenario==="extensive")drawPossibleConnections(g);
}
function drawPossibleConnections(g){
  const depth=currentDepth(),searchExtent=expandExtentBox(g.extent,2.1);
  const candidates=queryNormalizedPois(searchExtent,"cavity").map(p=>p.raw).filter(c=>{
    if(!cavityType(c).includes("carri"))return false;
    if(!depthStrength(c,depth))return false;
    return true;
  });
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const a=candidates[i],b=candidates[j];
    const distance=distanceMeters(a,b);
    if(distance<140||distance>720)continue;
    const pa=coordToGrid(a.lat,a.lon,g.extent),pb=coordToGrid(b.lat,b.lon,g.extent);
    const bothOutside=(
      (pa.x<0||pa.y<0||pa.x>=CONFIG.gridW||pa.y>=CONFIG.gridH)&&
      (pb.x<0||pb.y<0||pb.x>=CONFIG.gridW||pb.y>=CONFIG.gridH)
    );
    if(bothOutside)continue;
    const confidence=distance<300?"med":"low";
    const info={kind:"connexion possible entre exploitations",name:`${cavityName(a)} ↔ ${cavityName(b)}`,source:`connexion interprétative dans la coupe ${depthSliceLabel(depth)} · aucune continuité attestée`,confidenceLabel:confidence==="med"?"moyenne":"faible"};
    let n=0;bresenham(pa.x,pa.y,pb.x,pb.y,(x,y)=>{if(n++%3===0)put(g,x,y,"·",confidence==="med"?"c-hyp-med":"c-hyp-low",9,info,confidence)});
  }
}

function renderUndergroundBase(g){
  const depth=currentDepth();if(depth===0)return;
  const baseChar=depth===-3?":":"%";
  const baseCls=depth===-3?"c-soil":"c-rock";
  for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
    const noise=((x*17+y*31+Math.abs(depth)*13)%29===0);
    put(g,x,y,noise&&depth<=-8?":":baseChar,noise?"c-fracture":baseCls,1,{kind:depth===-3?"sol et remblais schématiques":"substrat rocheux schématique",source:`fond de coupe ${depthSliceLabel(depth)} · modèle visuel, pas une carte géologique ni un sondage`});
  }
  if(state.layerSurface){
    const ghost=createGrid(g.extent);renderSurface(ghost);
    for(let y=0;y<CONFIG.gridH;y++)for(let x=0;x<CONFIG.gridW;x++){
      const c=ghost.grid[y][x];
      if(c.priority>=7&&((x+y)%3===0))put(g,x,y,c.ch,"c-ghost",2,{kind:"projection fantôme de la surface",source:c.feature?.source||"surface"});
    }
  }
}

let depthTransitionTimer=0;
function playDepthTransition(direction){
  if(!ambientAllowed()||!els.depthTransition)return;
  clearTimeout(depthTransitionTimer);
  els.depthTransition.className=`depth-transition ${direction}`;
  void els.depthTransition.offsetWidth;
  els.depthTransition.classList.add("active");
  depthTransitionTimer=setTimeout(()=>{els.depthTransition.className="depth-transition"},700);
}
function pulseCard(card){
  if(!ambientAllowed()||!card)return;
  card.classList.remove("card-awake");void card.offsetWidth;card.classList.add("card-awake");
  setTimeout(()=>card.classList.remove("card-awake"),430);
}
function poiEffectKind(cell){
  if(!ambientAllowed()||!cell)return "";
  const cls=String(cell.cls||""),f=cell.feature||{};
  if(cls.includes("c-label"))return "";
  if(f.poiCategory)return f.poiCategory;
  if(cls.includes("c-user-position"))return "location";
  if(cls.includes("c-house")||cls.includes("c-address"))return "home";
  if(cls.includes("c-bss")||cls.includes("c-piezo"))return "bss";
  if(cls.includes("c-heritage"))return "heritage";
  if(cls.includes("c-carto")||cls.includes("c-lore-friche")||cls.includes("c-lore-abandoned"))return "industrial";
  if(cls.includes("c-observation")||cls.includes("c-lore")||cls.includes("c-sight")||cls.includes("c-zone"))return "memory";
  if((cls.includes("c-doc")||cls.includes("c-pillar"))&&selectableFeature(cell))return f.cavity?"cavity":"natural";
  if(cls.includes("c-demo")||cls.includes("c-explorer-hint"))return "natural";
  return "";
}

let scheduledRenderFrame=0,scheduledRenderReason="";
function scheduleRender(reason="scheduled"){
  scheduledRenderReason=reason;
  if(scheduledRenderFrame)return;
  scheduledRenderFrame=requestAnimationFrame(()=>{scheduledRenderFrame=0;const why=scheduledRenderReason;scheduledRenderReason="";render(why)});
}
function render(reason="direct"){
  const renderStarted=performance.now();
  hideHover();
  if(debugState.enabled)debugState.lastReason=reason;
  if(!drag)clearPanPreview();
  const responsiveMain=document.querySelector("main");
  if(responsiveMain)applyResponsiveGridProfile(responsiveMain);
  const z=currentZoom(),depth=currentDepth(),extent=extentFor();
  spatialRuntime.lastQueryCandidates=0;spatialRuntime.lastQueryResults=0;ensureSpatialIndexes();
  const g=createGrid(extent);
  document.body.dataset.depthBand=depth===0?"surface":depth>=-5?"shallow":depth>=-15?"middle":"deep";
  if(depth===0){
    if(state.layerSurface)renderSurface(g);
    applyRelief(g);
    drawBss(g);
    drawObservations(g);
    drawHeritage(g);
    drawLore(g);
    drawCavities(g);
    drawCartofriches(g);
    drawOfflineDemoPoints(g);
    drawUserLocation(g);
  }else{
    renderUndergroundBase(g);
    drawHypotheses(g);
    drawBss(g);
    drawCavities(g);
    drawUserLocation(g);
  }
  state.lastGrid=g;
  let visiblePoiCount=0;
  if(CANVAS_RENDERER){
    visiblePoiCount=drawCanvasMap(g,reason);
    els.map.textContent="";
  }else{
    let out="";
    for(let y=0;y<CONFIG.gridH;y++){
      for(let x=0;x<CONFIG.gridW;x++){
        const c=g.grid[y][x],shade=state.layerRelief&&Number.isFinite(c.elev)?` shade${c.shade||0}`:"";
        const attrs=`data-x="${x}" data-y="${y}"`,glyph=c.ch;
        const poiKind=poiEffectKind(c),poiClass=poiKind?` poi-fx poi-${poiKind}`:"";
        if(poiKind)visiblePoiCount++;
        const poiStyle=poiKind?` style="--poi-phase:${Math.abs((x+1)*7+(y+1)*11)%7}"`:"";
        out+=`<span class="cell ${c.cls||""}${shade}${poiClass}" ${attrs}${poiStyle}>${esc(glyph)}</span>`;
      }
      out+="\n";
    }
    els.map.innerHTML=out;
  }
  syncSelectionDom();
  if(pendingPoiFeedback)requestAnimationFrame(applyPendingPoiSelectionFeedback);
  updateSelectionAssist();
  scheduleOsmEnsure();
  if(els.locationBadge){
    const loc=state.userLocation;
    els.locationBadge.textContent=state.locationLoading?"recherche…":loc?`± ${Math.round(loc.accuracy||0)} m`:"non localisée";
  }
  els.mapTip.textContent=coarsePointer()?`pause 0,3 s = détail · toucher = sélectionner · glisser = déplacement · ⌖ = position${CANVAS_RENDERER?" · Canvas":""}`:`pause 0,3 s = détail · clic = sélectionner · glisser = déplacement · molette = zoom${CANVAS_RENDERER?" · Canvas":""}`;
  els.zoomLabel.textContent=z.label;
  els.depthLabel.textContent=depthSliceLabel(depth);
  const cellX=z.widthKm*1000/CONFIG.gridW,cellY=z.heightKm*1000/CONFIG.gridH;
  els.cellSizeLabel.textContent=`≈ ${Math.round((cellX+cellY)/2)} m`;
  els.centerLabel.textContent=`${state.center.lat.toFixed(5)} / ${state.center.lon.toFixed(5)}`;
  updateRenderModeControls();
  const renderSuffix=effectiveRenderMode()==="symbolic"?" · symbolique":" · ASCII";
  els.truthBadge.textContent=(depth===0?(state.cadastreBuildings.length&&semanticZoom().cadastreBuildings?"surface OSM + cadastre":state.osm?"surface OSM vectorielle":state.zoomIndex===3?(OFFLINE_TEST?"surface locale embarquée":"surface de secours V0.1"):"surface en attente"):`coupe interprétative · ${depthSliceMeta(depth).range}`)+renderSuffix;
  els.zoomHelp.textContent=`Fenêtre ≈ ${z.widthKm.toLocaleString("fr-FR")} × ${z.heightKm.toLocaleString("fr-FR")} km · une case ≈ ${Math.round(cellX)} × ${Math.round(cellY)} m · détail affiché : ${semanticZoom().summary}.`;
  document.querySelectorAll("[data-zoom]").forEach(b=>b.classList.toggle("active",+b.dataset.zoom===state.zoomIndex));
  document.querySelectorAll("[data-depth]").forEach(b=>b.classList.toggle("active",+b.dataset.depth===depth));
  els.zoomOut.disabled=state.zoomIndex===0;els.zoomIn.disabled=state.zoomIndex===CONFIG.zooms.length-1;
  els.mapZoomOut.disabled=state.zoomIndex===0;els.mapZoomIn.disabled=state.zoomIndex===CONFIG.zooms.length-1;
  els.depthUp.disabled=state.depthIndex===0;els.depthDown.disabled=state.depthIndex===CONFIG.depths.length-1;
  els.mapDepthUp.disabled=state.depthIndex===0;els.mapDepthDown.disabled=state.depthIndex===CONFIG.depths.length-1;
  updateSnapshotUI();
  const renderElapsed=performance.now()-renderStarted;
  debugState.renderCount++;debugState.lastRenderMs=renderElapsed;debugState.totalRenderMs+=renderElapsed;
  debugState.maxRenderMs=Math.max(debugState.maxRenderMs,renderElapsed);debugState.lastPoiCount=visiblePoiCount;
  updateDebugPanel();
  requestAnimationFrame(()=>{alignRenderedCenterToVisibleViewport();syncSelectionDom();updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker()});
  updateSidebarClusterStatus();
  updateAroundMe();
  updateGuidedTourUI();
  scheduleFrameFit();
}


function setCollapsibleState(container,collapsed,selector){
  if(!container)return;
  container.classList.toggle("collapsed",!!collapsed);
  const trigger=selector?container.querySelector(selector):container.querySelector(":scope > h2, :scope > .sidebar-cluster-head");
  if(trigger)trigger.setAttribute("aria-expanded",String(!collapsed));
}
function prepareReadoutSections(){
  if(!els.readoutBody)return;
  const collapsedByDefault=new Set(["À proximité","Lieux en relation","Données techniques et sources"]);
  for(const sec of els.readoutBody.querySelectorAll('.cell-section')){
    if(sec.dataset.foldableReady)continue;
    const heading=sec.querySelector(':scope > h3');
    if(!heading)continue;
    const title=(heading.textContent||'').trim();
    const body=document.createElement('div');
    body.className='cell-section-body';
    while(heading.nextSibling)body.appendChild(heading.nextSibling);
    sec.appendChild(body);
    sec.dataset.foldableReady='1';
    sec.classList.add('is-foldable');
    const collapsed=collapsedByDefault.has(title);
    sec.classList.toggle('collapsed',collapsed);
    heading.setAttribute('role','button');
    heading.setAttribute('tabindex','0');
    heading.setAttribute('aria-expanded',String(!collapsed));
    const toggle=()=>{
      const next=!sec.classList.contains('collapsed');
      sec.classList.toggle('collapsed',next);
      heading.setAttribute('aria-expanded',String(!next));
      retroAudio.play(next?'panelClose':'panelOpen');
    };
    heading.addEventListener('click',toggle);
    heading.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  }
}

function classifyAtlasControls(){
  const danger=/clear|remove|delete|reset|vider|supprimer|oublier|quitter/i;
  const sync=/sync|retry|reload|refresh|geocode|charger|actualiser|tester/i;
  const primary=/locate|observe|start|apply|add|import|exportStandalone|recenter|home/i;
  const nav=/zoom|depth|pan|prev|next|center|mapHome|mapLocate/i;
  for(const button of document.querySelectorAll('button')){
    button.classList.remove('action-primary','action-sync','action-danger','action-nav','action-subtle');
    const token=`${button.id} ${button.textContent}`;
    if(danger.test(token))button.classList.add('action-danger');
    else if(sync.test(token))button.classList.add('action-sync');
    else if(nav.test(token))button.classList.add('action-nav');
    else if(primary.test(token))button.classList.add('action-primary');
    else button.classList.add('action-subtle');
  }
}
function updateSidebarClusterStatus(){
  if(!els.sidebar?.dataset.clustered)return;
  const set=(code,text,live=false)=>{
    const el=els.sidebar.querySelector(`[data-cluster-status="${code}"]`);if(!el)return;
    el.textContent=text;el.classList.toggle('is-live',!!live);
  };
  const z=CONFIG.zooms?.[state.zoomIndex];
  set('01',state.userLocation?`GPS ±${Math.round(state.userLocation.accuracy||0)} m`:`${z?.label||'carte'} · surface`,!!state.userLocation);
  const layerInputs=[...els.sidebar.querySelectorAll('#layerSurface,#layerRelief,#layerCadastreBuildings,#layerParcels,#layerBss,#layerObservations,#layerHeritage,#layerLore,#layerCartofriches,#layerCavities,#layerHypothesis,#layerHydrology,#layerLabels,#layerHouse')];
  const active=layerInputs.filter(v=>v.checked).length;set('02',`${active}/${layerInputs.length} actifs`,active>0);
  const codex=typeof encounterCollectionStats==='function'?encounterCollectionStats().identified:0;
  const notes=(state.observations?.length||0)+(state.loreItems?.length||0);
  set('03',`${notes} notes · ${codex} fiches`,notes+codex>0);
  const sourceIds=['osmStatus','addressStatus','cadastreStatus','cavityStatus','cartofrichesStatus','heritageStatus','bssStatus','elevationStatus'];
  const statuses=sourceIds.map(id=>els[id]).filter(Boolean),ok=statuses.filter(v=>v.classList.contains('ok')).length;
  set('04',`${ok}/${statuses.length} prêtes`,ok>0);
}
function documentarySignalProfile(cell){
  const f=cell?.feature||{},p=evidenceProfile(cell);let level=1,label='contexte',color='#77a9bc';
  if(f.heritage||f.bss||f.cavity||f.cartofriches||f.source){level=4;label='source documentée';color='#79e2ab'}
  if(f.observation||f.lore){level=Math.max(level,2);label='trace locale';color='#d895b8'}
  if(currentDepth()<0||p.hypothesis){level=Math.min(level,2);label='coupe interprétative';color='#ad8bd1'}
  if(p.documented&&p.observed){level=Math.max(level,4);label='sources croisées';color='#e8bd64'}
  return {level,label,color};
}
function documentarySignalHtml(cell){
  const s=documentarySignalProfile(cell),bars=Array.from({length:5},(_,i)=>`<i class="${i<s.level?'on':''}"></i>`).join('');
  return `<div class="documentary-signal" style="--signal-color:${s.color}"><span>assise documentaire</span><span class="documentary-signal-track" aria-label="${s.level} niveaux sur 5">${bars}</span><strong>${esc(s.label)}</strong></div>`;
}

function buildSidebarClusters(){
  if(!els.sidebar||els.sidebar.dataset.clustered==='1')return;
  const cards=[...els.sidebar.querySelectorAll(':scope > .card')];
  const byTitle=new Map(cards.map(card=>[(card.querySelector(':scope > h2')?.textContent||'').trim(),card]));
  const groups=[
    {code:'01',title:'Exploration',icon:'⌖',meta:'se déplacer · se situer · enquêter',open:true,cards:['Ma position','Autour de moi','Rencontres locales','Parcours guidés','Échelle géographique','Profondeur','Navigation géographique','Aller à une cavité']},
    {code:'02',title:'Calques & lecture',icon:'▦',meta:'composer la carte · lire ses signes',open:true,cards:['Couches','Légende lisible']},
    {code:'03',title:'Carnet local',icon:'◎',meta:'mémoriser · observer · annoter',open:false,cards:['Mémoire de l’Atlas','Observations de terrain','Repères patrimoine & mystère']},
    {code:'04',title:'Sources & synchronisation',icon:'↻',meta:'charger · vérifier · archiver',open:false,cards:['Données','Patrimoine & curiosités synchronisés','Cartofriches · Cerema','Forages BSS & piézomètres','Diagnostic']}
  ];
  const frag=document.createDocumentFragment();
  for(const group of groups){
    const cluster=document.createElement('section');
    cluster.className='sidebar-cluster collapsible'+(group.open?'':' collapsed');
    cluster.dataset.group=group.title.toLowerCase();
    cluster.innerHTML=`<div class="sidebar-cluster-head" role="button" tabindex="0" aria-expanded="${group.open?'true':'false'}"><div style="min-width:0;flex:1"><h2><span class="cluster-code">[${group.code}]</span>${group.title}<span class="cluster-status" data-cluster-status="${group.code}">veille</span></h2><div class="cluster-meta">${group.meta}</div></div></div><div class="sidebar-cluster-body"></div>`;
    const body=cluster.querySelector('.sidebar-cluster-body');
    for(const title of group.cards){const card=byTitle.get(title); if(card) body.appendChild(card);}
    const head=cluster.querySelector('.sidebar-cluster-head');
    const toggle=()=>{const next=!cluster.classList.contains('collapsed');setCollapsibleState(cluster,next,'.sidebar-cluster-head');retroAudio.play(next?'panelClose':'panelOpen');scheduleFrameFit()};
    head.addEventListener('click',toggle);
    head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
    frag.appendChild(cluster);
  }
  const notice=els.sidebar.querySelector('#offlineNotice'); if(notice)frag.appendChild(notice);
  const warning=els.sidebar.querySelector('.warning'); if(warning)frag.appendChild(warning);
  els.sidebar.appendChild(frag);
  els.sidebar.dataset.clustered='1';
  classifyAtlasControls();
  updateSidebarClusterStatus();
}

function prepareSidebarCards(){
  const panelMeta={
    "Mode d’utilisation":["navigation","◈"],"Autour de moi":["navigation","⌖"],"Échelle géographique":["navigation","⌗"],"Profondeur":["navigation","⇅"],"Couches":["layers","▦"],"Navigation géographique":["navigation","⌖"],
    "Mémoire de l’Atlas":["memory","◫"],"Aller à une cavité":["navigation","⌁"],"Observations de terrain":["field","◎"],"Repères patrimoine & mystère":["field","◇"],
    "Cartofriches · Cerema":["sources","F"],"Patrimoine & curiosités synchronisés":["sources","P"],"Forages BSS & piézomètres":["sources","B"],"Données":["sources","↻"],"Diagnostic":["sources","⚙"],"Légende lisible":["layers","?"],"Provenance des données":["sources","§"]
  };
  const openByDefault=new Set([
    "Ma position","Autour de moi","Rencontres locales","Parcours guidés","Échelle géographique","Profondeur","Couches","Données"
  ]);
  for(const card of els.sidebar.querySelectorAll(":scope > .card")){
    if(card.classList.contains("warning")||card.id==="offlineNotice"||card.classList.contains("collapsible"))continue;
    const heading=card.querySelector(":scope > h2");
    if(!heading)continue;
    const meta=panelMeta[heading.textContent.trim()]||["navigation","•"];
    card.dataset.panelKind=meta[0];heading.dataset.icon=meta[1];
    const body=document.createElement("div");
    body.className="card-body";
    while(heading.nextSibling)body.appendChild(heading.nextSibling);
    card.appendChild(body);
    card.classList.add("collapsible");
    const title=heading.textContent.trim();
    const collapsed=!openByDefault.has(title);
    card.classList.toggle("collapsed",collapsed);
    heading.setAttribute("role","button");
    heading.setAttribute("tabindex","0");
    heading.setAttribute("aria-expanded",String(!collapsed));
    const toggle=()=>{
      const next=!card.classList.contains("collapsed");
      card.classList.toggle("collapsed",next);
      heading.setAttribute("aria-expanded",String(!next));
      retroAudio.play(next?"panelClose":"panelOpen");
      pulseCard(card);
      scheduleFrameFit();
    };
    heading.addEventListener("click",toggle);
    heading.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}
    });
  }
}
function setAllSidebarCards(collapsed){
  for(const card of els.sidebar.querySelectorAll(".card.collapsible")){
    card.classList.toggle("collapsed",collapsed);
    card.querySelector(":scope > h2")?.setAttribute("aria-expanded",String(!collapsed));
  }
  for(const cluster of els.sidebar.querySelectorAll(".sidebar-cluster.collapsible")){
    setCollapsibleState(cluster,collapsed,'.sidebar-cluster-head');
  }
  scheduleFrameFit();
}
function mobileSidebarMode(){return matchMedia("(max-width:940px)").matches}
function setSidebarOpen(open){
  if(mobileSidebarMode()){
    document.body.classList.toggle("sidebar-open",open);
  }else{
    document.body.classList.toggle("sidebar-collapsed",!open);
  }
  setTimeout(scheduleFrameFit,240);
}
function toggleSidebar(){
  if(mobileSidebarMode())setSidebarOpen(!document.body.classList.contains("sidebar-open"));
  else setSidebarOpen(document.body.classList.contains("sidebar-collapsed"));
}
let frameFitTimer=0;
let responsiveMapScale=1;
function effectiveMapViewportRect(){
  const vr=els.viewport?.getBoundingClientRect();
  if(!vr)return null;
  let bottom=vr.bottom;
  if(mobileReadoutMode()&&els.readout&&!document.body.classList.contains("info-collapsed")){
    const sheetState=els.readout.dataset.sheetState||"peek";
    const rr=els.readout.getBoundingClientRect();
    const overlaps=rr.left<vr.right&&rr.right>vr.left&&rr.top<vr.bottom&&rr.bottom>vr.top;
    // Quand la fiche est entièrement ouverte, la carte est volontairement
    // recouverte : on conserve sa géométrie au lieu de l'écraser à quelques lignes.
    if(overlaps&&sheetState!=="full"&&rr.top>vr.top+90)bottom=Math.min(bottom,rr.top-4);
  }
  const height=Math.max(1,bottom-vr.top);
  return {left:vr.left,top:vr.top,right:vr.right,bottom,width:Math.max(1,vr.width),height,centerX:vr.left+vr.width/2,centerY:vr.top+height/2};
}
function responsiveGridProfile(main){
  const desktop=matchMedia("(min-width:941px)").matches;
  const compact=matchMedia("(max-width:520px)").matches;
  const fontSize=compact?11:12,padding=compact?12:17;
  const available=effectiveMapViewportRect();
  const roomW=Math.max(desktop?620:260,available?.width||main.clientWidth||window.innerWidth);
  const roomH=Math.max(desktop?320:190,available?.height||els.viewport?.clientHeight||window.innerHeight*.58);
  const probe=measureCanvasLayout(fontSize,padding);

  // La grille est calculée depuis la fenêtre réellement disponible, et non
  // depuis la résolution physique de l'écran. Elle fonctionne donc aussi avec
  // la mise à l'échelle Windows à 125 %, 150 % ou davantage.
  let columns=Math.floor((roomW-padding*2-8)/Math.max(1,probe.cellW));
  let rows=Math.floor((roomH-padding*2-8)/Math.max(1,probe.cellH));
  columns=Math.floor(columns/8)*8;
  rows=Math.floor(rows/(desktop?4:2))*(desktop?4:2);
  columns=clamp(columns,desktop?120:40,desktop?384:160);
  rows=clamp(rows,desktop?44:18,desktop?128:104);

  // Hystérésis pour éviter les oscillations lorsque les barres de défilement
  // apparaissent ou disparaissent d'un pixel.
  if(Math.abs(columns-CONFIG.gridW)<16)columns=CONFIG.gridW;
  if(Math.abs(rows-CONFIG.gridH)<4)rows=CONFIG.gridH;
  return {w:columns,h:rows};
}
function applyResponsiveGridProfile(main){
  const next=responsiveGridProfile(main);
  if(next.w===CONFIG.gridW&&next.h===CONFIG.gridH)return false;
  CONFIG.gridW=next.w;CONFIG.gridH=next.h;
  return true;
}
function setMapCssVariable(main,name,value){
  if(main.style.getPropertyValue(name)!==value)main.style.setProperty(name,value);
}
function alignRenderedCenterToVisibleViewport(){
  if(!mobileReadoutMode()||!els.viewport)return;
  const surface=activeMapSurface(),visible=effectiveMapViewportRect();
  if(!surface||!visible)return;
  const vr=els.viewport.getBoundingClientRect();
  const targetX=visible.centerX-vr.left;
  const targetY=visible.centerY-vr.top;
  const surfaceCenterX=surface.offsetLeft+surface.offsetWidth/2;
  const surfaceCenterY=surface.offsetTop+surface.offsetHeight/2;
  const maxX=Math.max(0,els.viewport.scrollWidth-els.viewport.clientWidth);
  const maxY=Math.max(0,els.viewport.scrollHeight-els.viewport.clientHeight);
  els.viewport.scrollLeft=clamp(surfaceCenterX-targetX,0,maxX);
  els.viewport.scrollTop=clamp(surfaceCenterY-targetY,0,maxY);
}
function fitMapFrame(){
  const main=document.querySelector("main"),surface=activeMapSurface();
  if(!main||!surface||!els.viewport)return;
  const compact=matchMedia("(max-width:520px)").matches,desktop=matchMedia("(min-width:941px)").matches;
  const baseFont=compact?11:12,basePadding=compact?12:17;
  // Une seule autorité : taille de cellule fixe + nombre de lignes/colonnes
  // calculé depuis la fenêtre disponible. Aucun second zoom CSS du Canvas.
  setMapCssVariable(main,"--map-font-size",`${baseFont}px`);
  setMapCssVariable(main,"--map-padding",`${basePadding}px`);
  const availableWidth=Math.max(280,main.clientWidth);
  setMapCssVariable(main,"--map-frame-width",desktop?`${availableWidth}px`:"100%");
  responsiveMapScale=1;
  if(applyResponsiveGridProfile(main)){scheduleRender("responsive-grid");return}
  const previousSignature=canvasRuntime.layoutSignature;
  const m=CANVAS_RENDERER?syncCanvasSize():null;
  const finalWidth=Math.ceil(m?.displayWidth||els.map.scrollWidth+2);
  const frameWidth=desktop?availableWidth:Math.min(availableWidth,finalWidth);
  setMapCssVariable(main,"--map-frame-width",`${frameWidth}px`);
  els.viewport.classList.toggle("map-centered",finalWidth<frameWidth-4);
  if(CANVAS_RENDERER&&state.lastGrid&&previousSignature!==canvasRuntime.layoutSignature)drawCanvasMap(state.lastGrid,"layout-fit");
  else if(CANVAS_RENDERER)syncRenderFxGeometry(m);
  requestAnimationFrame(()=>{
    syncRenderFxGeometry(canvasRuntime.metrics);alignRenderedCenterToVisibleViewport();
    syncSelectionDom();if(pendingPoiFeedback)applyPendingPoiSelectionFeedback();
    updateWorldBoundaryFrame();updateRelationOverlay();updateGuidedTourMarker();
  });
}
function scheduleFrameFit(){
  clearTimeout(frameFitTimer);
  frameFitTimer=setTimeout(()=>{
    frameFitTimer=0;
    requestAnimationFrame(fitMapFrame);
  },34);
}
function mobileReadoutMode(){return matchMedia?.("(max-width:940px)")?.matches}
let readoutFitTimer=0;
function setReadoutSheetState(next){
  if(!els.readout)return;
  // Les anciennes demandes « medium » sont volontairement promues vers la
  // seule taille de lecture utile. Il ne reste que deux états : replié / ouvert.
  const normalized=next==="peek"?"peek":"full";
  els.readout.dataset.sheetState=normalized;
  els.readoutSheetHandle?.setAttribute("aria-label",normalized==="full"?"Replier la fiche de cellule":"Déployer la fiche de cellule");
  requestAnimationFrame(()=>{updateWorldBoundaryFrame();updateRelationOverlay()});
  clearTimeout(readoutFitTimer);
  // La hauteur réellement libre n'est fiable qu'à la fin de la transition CSS.
  readoutFitTimer=setTimeout(()=>{readoutFitTimer=0;scheduleFrameFit()},280);
}
function cycleReadoutSheet(){
  const current=els.readout?.dataset.sheetState||"peek";
  setReadoutSheetState(current==="full"?"peek":"full");
}
function setReadoutContent(html,{title="Fiche de cellule",sheet="full",kind="poi"}={}){
  if(els.readout)els.readout.dataset.readoutKind=kind;
  if(els.readoutBody)els.readoutBody.innerHTML=html;
  if(els.readoutSheetLabel)els.readoutSheetLabel.textContent=title;
  prepareReadoutSections();
  setInfoVisible(true);
  setReadoutSheetState(sheet==="peek"?"peek":"full");
}
function plainCellIdentity(cell){
  const f=cell?.feature||{},tags=f.tags||{},cls=String(cell?.cls||"");
  const name=String(f.name||tags.name||"").trim(),ref=String(tags.ref||f.ref||"").trim();
  let label="Terrain non nommé",kind="lecture du terrain",symbol=symbolForCell(cell),qualifier="";
  if(cls.includes("water")){
    const waterway=String(tags.waterway||f.waterway||"").toLowerCase();
    label=waterway==="river"?"Rivière":waterway==="stream"?"Ruisseau":waterway==="canal"?"Canal":waterway==="ditch"?"Fossé":waterway==="drain"?"Drain / fossé":"Cours d’eau ou zone humide";
    kind="hydrographie";symbol="≈";
  }else if(cls.includes("path")){
    const highway=String(tags.highway||"").toLowerCase();
    label=highway==="footway"?"Sentier pédestre":highway==="cycleway"?"Piste cyclable":highway==="track"?"Piste / chemin agricole":"Chemin";
    kind="voie douce";symbol="·";
  }else if(cls.includes("road")){
    const highway=String(tags.highway||"").toLowerCase();
    const roads={motorway:"Autoroute",trunk:"Axe majeur",primary:"Route principale",secondary:"Route départementale",tertiary:"Route locale",residential:"Rue résidentielle",service:"Voie de service",unclassified:"Route locale",track:"Piste"};
    label=roads[highway]||"Route ou voie";kind="circulation";symbol=cls.includes("major")?"═":"─";
  }else if(cls.includes("forest")){
    label=tags.landuse==="forest"?"Forêt":"Bois / couverture arborée";kind="végétation";symbol="T";
  }else if(cls.includes("meadow")){
    label="Prairie";kind="espace ouvert";symbol=",";
  }else if(cls.includes("field")){
    const land=String(tags.landuse||f.landuse||"").toLowerCase();
    label=land==="orchard"?"Verger":land==="vineyard"?"Vigne":land==="farmland"?"Champ cultivé":"Champ / parcelle ouverte";
    kind="occupation du sol";symbol=".";
  }else if(cls.includes("building")||cls.includes("cad-building")){
    const building=String(tags.building||f.building||"").toLowerCase();
    label=building&&building!=="yes"?`Bâtiment · ${building}`:"Bâtiment cadastral";kind="bâti";symbol="█";
  }else if(cls.includes("quarry")){
    label="Carrière ou terrain d’extraction";kind="terrain remanié";symbol="q";
  }else if(cls.includes("scrub")){
    label="Friche végétale / broussailles";kind="végétation";symbol=";";
  }else if(currentDepth()<0){
    label=`Coupe interprétative ${depthSliceLabel()}`;kind="sous-sol hypothétique";symbol=cell?.ch||"▓";
  }
  const displayName=name||ref;
  if(displayName)qualifier=displayName;
  else if(f.kind&&!/objet cartographique/i.test(String(f.kind)))qualifier=String(f.kind);
  return {label,kind,symbol,qualifier,source:f.source||""};
}
function plainCellSummaryHtml(cell,x,y){
  const identity=plainCellIdentity(cell),coord=gridToCoord(x,y,state.lastGrid.extent),slope=localSlopeDegrees(x,y);
  const metrics=[Number.isFinite(cell.elev)?`alt. ≈ ${Math.round(cell.elev)} m`:"",Number.isFinite(slope)?`pente ≈ ${slope.toFixed(1)}°`:"",`${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`].filter(Boolean).join(" · ");
  const detail=identity.qualifier?`<strong>${esc(identity.qualifier)}</strong> · ${esc(identity.label)}`:esc(identity.label);
  const source=identity.source?`<span class="plain-cell-source">source : ${esc(identity.source)}</span>`:"lecture issue des couches visibles";
  return `<div class="plain-cell-summary"><div class="plain-cell-symbol">${esc(identity.symbol)}</div><div><div class="plain-cell-kicker">${esc(identity.kind)}</div><div class="plain-cell-title">${detail}</div><div class="plain-cell-detail">${esc(terrainPhrase(cell,slope,x,y))}</div><div class="plain-cell-meta">${esc(metrics)} · ${source}</div></div></div>`;
}
function collapseReadoutForPlainCell(cell,x,y){
  // Invalide une éventuelle hydratation documentaire encore en attente.
  descriptionRuntime.selectionToken++;
  const identity=plainCellIdentity(cell);
  const title=identity.qualifier?`${identity.label} · ${identity.qualifier}`:identity.label;
  setReadoutContent(plainCellSummaryHtml(cell,x,y),{title,sheet:"full",kind:"plain"});
}

function setInfoVisible(visible){
  document.body.classList.toggle("info-collapsed",!visible);
  els.infoToggle.textContent=visible?"ⓘ replier":"ⓘ infos";
  if(visible&&mobileReadoutMode()&&!els.readout.dataset.sheetState)setReadoutSheetState("peek");
  setTimeout(scheduleFrameFit,30);
}
function closeMobileSidebarAfterAction(){
  if(mobileSidebarMode())setSidebarOpen(false);
}
function populateControls(){
  CONFIG.zooms.forEach((z,i)=>{
    const b=document.createElement("button");b.dataset.zoom=i;b.title=z.label;b.textContent=z.short;
    b.addEventListener("click",()=>{setZoomFromViewport(i);closeMobileSidebarAfterAction()});els.zoomButtons.appendChild(b);
  });
  CONFIG.depths.forEach((d,i)=>{
    const b=document.createElement("button");b.dataset.depth=d;b.textContent=depthSliceLabel(d);b.title=d===0?"Surface":`${depthSliceMeta(d).range} · coupe interprétative, non mesurée par défaut`;
    b.addEventListener("click",()=>{setDepthIndex(i);closeMobileSidebarAfterAction()});els.depthButtons.appendChild(b);
  });
}
function populateCavitySelect(){
  const list=state.cavities.length?state.cavities:CAVITY_INVENTORY;
  els.cavitySelect.innerHTML='<option value="">Choisir une cavité…</option>';
  list.slice().sort((a,b)=>cavityName(a).localeCompare(cavityName(b),"fr")).forEach(c=>{
    const o=document.createElement("option");o.value=c.id;o.textContent=`${cavityMarker(c).glyph} ${cavityName(c)}${c.commune?` · ${c.commune}`:""}${Number.isFinite(c.lat)?"":" · coordonnées indisponibles"}`;
    o.disabled=!Number.isFinite(c.lat);els.cavitySelect.appendChild(o);
  });
  els.cavityHelp.textContent=state.cavityInventoryOnly?"L’inventaire communal est disponible, mais le service de coordonnées n’a pas répondu. Les repères OSM et locaux restent utilisables.":"Sélectionner un repère recentre la carte et passe au zoom Secteur. Les données BRGM sont recherchées dans toute l’emprise navigable.";
}

let navigationRenderTimer=0;
function scheduleNavigationRender(delay=34){
  clearTimeout(navigationRenderTimer);
  navigationRenderTimer=setTimeout(()=>{navigationRenderTimer=0;render()},delay);
}
function moveCenter(dx,dy,fraction=null){
  retroAudio.play(dx||dy?"button":"click");
  const z=currentZoom(),step=fraction??z.pan;
  const dLat=z.heightKm/111.32*step*dy;
  const dLon=z.widthKm/kmPerLon(state.center.lat)*step*dx;
  state.center=clampCenter({lat:state.center.lat+dLat,lon:state.center.lon+dLon},z);
  scheduleNavigationRender();
}
function setDepthIndex(i){
  clearActiveRelation();
  const previous=state.depthIndex,next=clamp(i,0,CONFIG.depths.length-1);
  if(next===previous)return;
  state.depthIndex=next;
  retroAudio.play(next>previous?"depthDown":"depthUp");
  playDepthTransition(next>previous?"down":"up");
  closeSelectionAssist();render();
}

let zoomFxTimer=0,zoomCorrectionTimer=0,zoomCorrectionSerial=0;
function clearZoomTransition(){
  clearTimeout(zoomFxTimer);
  const overlay=els.zoomTransitionCanvas;
  if(overlay){overlay.className="zoom-transition-canvas";overlay.style.cssText=""}
  els.viewport?.classList.remove("zoom-feedback");
}
function beginZoomTransition(direction,clientPoint=null){
  if(!CANVAS_RENDERER||!els.zoomTransitionCanvas||!els.mapCanvas||matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
  const source=els.mapCanvas,overlay=els.zoomTransitionCanvas;
  if(!source.width||!source.height)return;
  clearZoomTransition();
  const vr=els.viewport.getBoundingClientRect(),sr=source.getBoundingClientRect();
  if(!sr.width||!sr.height)return;
  overlay.width=source.width;overlay.height=source.height;
  const ctx=overlay.getContext("2d",{alpha:false});
  ctx.clearRect(0,0,overlay.width,overlay.height);ctx.drawImage(source,0,0);
  const left=Math.round(sr.left-vr.left+(els.viewport.scrollLeft||0));
  const top=Math.round(sr.top-vr.top+(els.viewport.scrollTop||0));
  overlay.style.left=`${left}px`;overlay.style.top=`${top}px`;
  overlay.style.width=`${Math.round(sr.width)}px`;overlay.style.height=`${Math.round(sr.height)}px`;
  const cx=Number.isFinite(clientPoint?.clientX)?clientPoint.clientX:vr.left+vr.width/2;
  const cy=Number.isFinite(clientPoint?.clientY)?clientPoint.clientY:vr.top+vr.height/2;
  const ox=clamp((cx-sr.left)/Math.max(1,sr.width),0,1),oy=clamp((cy-sr.top)/Math.max(1,sr.height),0,1);
  overlay.style.transformOrigin=`${(ox*100).toFixed(2)}% ${(oy*100).toFixed(2)}%`;
  overlay.className=`zoom-transition-canvas active ${direction==="in"?"zoom-in":"zoom-out"}`;
  els.viewport.style.setProperty("--zoom-origin-x",`${clamp((cx-vr.left)/Math.max(1,vr.width),0,1)*100}%`);
  els.viewport.style.setProperty("--zoom-origin-y",`${clamp((cy-vr.top)/Math.max(1,vr.height),0,1)*100}%`);
  els.viewport.classList.remove("zoom-feedback");void els.viewport.offsetWidth;els.viewport.classList.add("zoom-feedback");
  zoomFxTimer=setTimeout(clearZoomTransition,360);
}
function scheduleZoomAnchorCorrection(focus,clientX,clientY){
  if(!focus||!Number.isFinite(clientX)||!Number.isFinite(clientY))return;
  const serial=++zoomCorrectionSerial;
  clearTimeout(zoomCorrectionTimer);
  zoomCorrectionTimer=setTimeout(()=>{
    if(serial!==zoomCorrectionSerial||!state.lastGrid)return;
    const mapped=mapPositionFromClient(clientX,clientY);if(!mapped)return;
    const dLat=focus.lat-mapped.coord.lat,dLon=focus.lon-mapped.coord.lon;
    if(Math.abs(dLat)<1e-8&&Math.abs(dLon)<1e-8)return;
    state.center=clampCenter({lat:state.center.lat+dLat,lon:state.center.lon+dLon},currentZoom());
    render();
  },82);
}

function setZoomIndex(i,focus=null,screen=null){
  const minZoom=0;
  const next=clamp(i,minZoom,CONFIG.zooms.length-1);
  if(next===state.zoomIndex)return;
  const direction=next>state.zoomIndex?"in":"out";
  beginZoomTransition(direction,screen);
  retroAudio.play(direction==="in"?"zoomIn":"zoomOut");
  state.zoomIndex=next;
  if(focus&&screen){
    const z=currentZoom();
    const heightDeg=z.heightKm/111.32;
    const widthDeg=z.widthKm/kmPerLon(focus.lat);
    state.center={
      lat:focus.lat+(screen.fy-.5)*heightDeg,
      lon:focus.lon-(screen.fx-.5)*widthDeg
    };
  }
  state.center=clampCenter(state.center,currentZoom());
  render();
  if(focus&&Number.isFinite(screen?.clientX)&&Number.isFinite(screen?.clientY))scheduleZoomAnchorCorrection(focus,screen.clientX,screen.clientY);
}
function viewportZoomAnchor(){
  const surface=activeMapSurface();
  if(!state.lastGrid||!els.viewport||!surface)return null;
  const vr=effectiveMapViewportRect()||els.viewport.getBoundingClientRect(),mr=surface.getBoundingClientRect();
  const clientX=clamp(vr.centerX??(vr.left+vr.width/2),mr.left+1,mr.right-1);
  const clientY=clamp(vr.centerY??(vr.top+vr.height/2),mr.top+1,mr.bottom-1);
  const pos=mapPositionFromClient(clientX,clientY);
  return pos?{...pos,clientX,clientY}:null;
}
function setZoomFromViewport(i){
  const anchor=viewportZoomAnchor();
  setZoomIndex(i,anchor?.coord,anchor?{fx:anchor.fx,fy:anchor.fy,clientX:anchor.clientX,clientY:anchor.clientY}:null);
}


function geolocationErrorLabel(err,context={}){
  const localFile=location.protocol==="file:";
  if(err?.code===1){
    if(!window.isSecureContext)return "Le navigateur bloque la géolocalisation dans ce contexte non sécurisé. Aucune fenêtre d’autorisation ne peut s’afficher ici.";
    if(context.permissionState==="denied")return localFile?"La géolocalisation est bloquée pour ce fichier local. Le navigateur peut refuser sans afficher de demande ; ouvre l’Atlas depuis une adresse HTTPS.":"La localisation est déjà bloquée pour ce site ou pour le navigateur. Réactive-la dans les réglages de permissions.";
    return localFile?"Le navigateur mobile a refusé la géolocalisation du fichier local sans afficher de demande. Une copie servie en HTTPS est nécessaire.":"Permission de localisation refusée ou bloquée par le navigateur.";
  }
  if(err?.code===2)return "Position indisponible. Vérifie que la localisation du téléphone est activée pour le navigateur.";
  if(err?.code===3)return "La recherche de position a dépassé le délai prévu.";
  return String(err?.message||"Impossible d’obtenir la position.");
}
async function geolocationPermissionState(){
  try{
    if(navigator.permissions?.query){
      const status=await navigator.permissions.query({name:"geolocation"});
      return status?.state||"unknown";
    }
  }catch{}
  return "unknown";
}
function geolocationContextHint(){
  if(!window.isSecureContext)return '<br><span class="location-warning">Cette page n’est pas dans un contexte sécurisé. Le même fichier doit être servi en HTTPS pour que le navigateur puisse demander la position.</span>';
  if(location.protocol==="file:")return '<br><span class="location-warning">Certains navigateurs mobiles bloquent la localisation des fichiers <code>file://</code> sans afficher de boîte de dialogue. Héberger ce même HTML en HTTPS contourne cette limite.</span>';
  return "";
}
function updateLocationUI(message=""){
  const loc=state.userLocation,inside=loc&&inExtent(loc.lat,loc.lon,largestExtent());
  if(els.locateMe){els.locateMe.disabled=state.locationLoading;els.locateMe.textContent=state.locationLoading?"⌖ vérification…":"⌖ me localiser"}
  if(els.mapLocate){els.mapLocate.disabled=state.locationLoading;els.mapLocate.classList.toggle("active",!!loc)}
  if(els.clearLocation)els.clearLocation.disabled=!loc;
  if(els.locationBadge)els.locationBadge.textContent=state.locationLoading?"vérification…":loc?(inside?`± ${Math.round(loc.accuracy||0)} m`:"hors emprise"):"non localisée";
  if(els.locationHelp){
    if(message)els.locationHelp.innerHTML=message;
    else if(loc)els.locationHelp.innerHTML=`Dernière mesure : <strong>${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}</strong> · précision ± ${Math.round(loc.accuracy||0)} m · ${new Date(loc.timestamp).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}. Position temporaire, non sauvegardée.`;
  }
  updateAroundMe();
  updateEncounterUI();
}
async function locateUser(){
  if(state.locationLoading)return;
  if(!navigator.geolocation){updateLocationUI('<span class="location-warning">La géolocalisation n’est pas disponible dans ce navigateur.</span>');retroAudio.play("error");return}
  state.locationLoading=true;updateLocationUI("Vérification du contexte et des permissions…");
  const permissionState=await geolocationPermissionState();
  if(!window.isSecureContext){
    state.locationLoading=false;
    updateLocationUI('<span class="location-warning">Le navigateur ne peut pas demander ta position depuis cette page : le contexte n’est pas sécurisé.</span>'+geolocationContextHint());
    retroAudio.play("error");render();return;
  }
  if(permissionState==="denied"){
    state.locationLoading=false;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel({code:1},{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();return;
  }
  updateLocationUI(permissionState==="prompt"?"Le navigateur devrait maintenant afficher sa demande d’autorisation…":"Recherche ponctuelle de la position…");
  navigator.geolocation.getCurrentPosition(pos=>{
    state.locationLoading=false;
    const c=pos.coords;
    state.userLocation={lat:Number(c.latitude),lon:Number(c.longitude),accuracy:Number(c.accuracy)||0,altitude:Number.isFinite(c.altitude)?c.altitude:null,heading:Number.isFinite(c.heading)?c.heading:null,speed:Number.isFinite(c.speed)?c.speed:null,timestamp:pos.timestamp||Date.now()};
    const inside=inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent());
    if(inside&&state.centerOnLocation){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom())}
    updateLocationUI(inside?"":'<span class="location-warning">Position obtenue, mais elle se trouve hors de l’emprise actuelle de l’Atlas.</span>');
    retroAudio.play("success");render();
  },err=>{
    state.locationLoading=false;
    updateLocationUI(`<span class="location-warning">${esc(geolocationErrorLabel(err,{permissionState}))}</span>${geolocationContextHint()}`);
    retroAudio.play("error");render();
  },{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
}
function clearUserLocation(){state.userLocation=null;updateLocationUI("Position masquée. Elle n’était pas enregistrée dans l’Atlas.");render()}

function cellElementAtClient(clientX,clientY){
  if(CANVAS_RENDERER)return null;
  const hit=document.elementFromPoint?.(clientX,clientY),cell=hit?.closest?.(".cell");
  return cell&&els.map.contains(cell)?cell:null;
}
function mapGridMetrics(){
  const cells=els.map?.children;
  const expected=CONFIG.gridW*CONFIG.gridH;
  if(!cells||cells.length<expected)return null;
  const first=cells[0],nextX=CONFIG.gridW>1?cells[1]:null,nextY=CONFIG.gridH>1?cells[CONFIG.gridW]:null;
  if(!first)return null;
  const a=first.getBoundingClientRect();
  const centerX=a.left+a.width/2,centerY=a.top+a.height/2;
  let pitchX=nextX?(nextX.getBoundingClientRect().left+nextX.getBoundingClientRect().width/2-centerX):a.width;
  let pitchY=nextY?(nextY.getBoundingClientRect().top+nextY.getBoundingClientRect().height/2-centerY):a.height;
  if(!Number.isFinite(pitchX)||Math.abs(pitchX)<.1)pitchX=a.width||1;
  if(!Number.isFinite(pitchY)||Math.abs(pitchY)<.1){
    const cs=getComputedStyle(els.map);
    pitchY=(parseFloat(cs.fontSize)||12)*(parseFloat(cs.lineHeight)||1.04);
  }
  return {centerX,centerY,pitchX:Math.abs(pitchX),pitchY:Math.abs(pitchY)};
}
function mapPositionFromClient(clientX,clientY){
  if(!state.lastGrid)return null;
  if(CANVAS_RENDERER){
    const d=canvasDisplayMetrics();if(!d)return null;
    // Les glyphes sont dessinés à l'origine de chaque case. Pour convertir le
    // pointeur en indice de cellule, on travaille toutefois par rapport au CENTRE
    // des cases. Sans ce demi-pas, le centre visuel de la case x était arrondi vers
    // x+1 : la croix se retrouvait dans le coin supérieur gauche de la surbrillance.
    const gridX=(clientX-d.r.left-d.paddingX)/d.cellW-.5;
    const gridY=(clientY-d.r.top-d.paddingY)/d.cellH-.5;
    const x=clamp(Math.round(gridX),0,CONFIG.gridW-1),y=clamp(Math.round(gridY),0,CONFIG.gridH-1);
    const fx=clamp(gridX/Math.max(1,CONFIG.gridW-1),0,1),fy=clamp(gridY/Math.max(1,CONFIG.gridH-1),0,1);
    const result={coord:{lon:state.lastGrid.extent.west+fx*(state.lastGrid.extent.east-state.lastGrid.extent.west),lat:state.lastGrid.extent.north-fy*(state.lastGrid.extent.north-state.lastGrid.extent.south)},fx,fy,x,y};
    if(debugState.enabled){debugState.lastPointer=`${x}, ${y} · ${result.coord.lat.toFixed(5)} / ${result.coord.lon.toFixed(5)}`;updateDebugPanel()}
    return result;
  }
  const metrics=mapGridMetrics();
  let gridX,gridY;
  if(metrics){
    // Convert from the real centres of the rendered glyph cells. This excludes
    // <pre> padding and remains exact when the panoramic grid or font size changes.
    gridX=(clientX-metrics.centerX)/metrics.pitchX;
    gridY=(clientY-metrics.centerY)/metrics.pitchY;
  }else{
    // Conservative fallback based on the content box rather than the padded box.
    const r=els.map.getBoundingClientRect(),cs=getComputedStyle(els.map);
    if(!r.width||!r.height)return null;
    const padL=parseFloat(cs.paddingLeft)||0,padR=parseFloat(cs.paddingRight)||0;
    const padT=parseFloat(cs.paddingTop)||0,padB=parseFloat(cs.paddingBottom)||0;
    const width=Math.max(1,r.width-padL-padR),height=Math.max(1,r.height-padT-padB);
    const fx0=clamp((clientX-r.left-padL)/width,0,1),fy0=clamp((clientY-r.top-padT)/height,0,1);
    gridX=fx0*(CONFIG.gridW-1);gridY=fy0*(CONFIG.gridH-1);
  }
  const x=clamp(Math.round(gridX),0,CONFIG.gridW-1),y=clamp(Math.round(gridY),0,CONFIG.gridH-1);
  const fx=clamp(gridX/Math.max(1,CONFIG.gridW-1),0,1),fy=clamp(gridY/Math.max(1,CONFIG.gridH-1),0,1);
  const result={coord:{lon:state.lastGrid.extent.west+fx*(state.lastGrid.extent.east-state.lastGrid.extent.west),lat:state.lastGrid.extent.north-fy*(state.lastGrid.extent.north-state.lastGrid.extent.south)},fx,fy,x,y};
  if(debugState.enabled){debugState.lastPointer=`${x}, ${y} · ${result.coord.lat.toFixed(5)} / ${result.coord.lon.toFixed(5)}`;updateDebugPanel()}
  return result;
}
function eventMapPosition(ev){
  if(!state.lastGrid)return null;
  if(CANVAS_RENDERER)return mapPositionFromClient(ev.clientX,ev.clientY);
  const cell=cellElementAtClient(ev.clientX,ev.clientY)||ev.target.closest?.(".cell");
  if(cell&&els.map.contains(cell)){
    const x=+cell.dataset.x,y=+cell.dataset.y;
    return {coord:gridToCoord(x,y,state.lastGrid.extent),fx:x/(CONFIG.gridW-1),fy:y/(CONFIG.gridH-1),x,y};
  }
  return mapPositionFromClient(ev.clientX,ev.clientY);
}
function coarsePointer(){
  return !!(matchMedia?.("(hover: none) and (pointer: coarse)")?.matches || (window.innerWidth<=700&&navigator.maxTouchPoints>0));
}
function selectableFeature(cell){
  const f=cell?.feature;
  return !!(f&&(f.poiId||f.name||f.id||f.cavity||f.observation||f.lore||f.bss||f.cartofriches));
}
function assistedCell(x,y,radius=2){
  if(!state.lastGrid)return {x,y,snapped:false};
  const exact=state.lastGrid.grid[y]?.[x];
  if(selectableFeature(exact))return {x,y,snapped:false};
  let best=null;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const nx=x+dx,ny=y+dy;
    if(nx<0||ny<0||nx>=CONFIG.gridW||ny>=CONFIG.gridH)continue;
    const cell=state.lastGrid.grid[ny]?.[nx];
    if(!selectableFeature(cell))continue;
    const d=Math.hypot(dx,dy);
    const named=cell.feature?.name?-.18:0;
    const important=cell.feature?.cavity||cell.feature?.observation||cell.feature?.lore?-.22:0;
    const score=d+named+important;
    if(!best||score<best.score)best={x:nx,y:ny,score,cell};
  }
  return best?{x:best.x,y:best.y,snapped:true}:{x,y,snapped:false};
}
let selectedDomCell=null,selectionNeighborDomCells=[];
function mapCellElement(x,y){
  if(CANVAS_RENDERER||!els.map||x<0||y<0||x>=CONFIG.gridW||y>=CONFIG.gridH)return null;
  return els.map.children[y*CONFIG.gridW+x]||null;
}
function clearSelectionDom(){
  if(selectedDomCell)selectedDomCell.classList.remove("selected");
  for(const el of selectionNeighborDomCells)el?.classList.remove("selection-neighbor");
  selectedDomCell=null;selectionNeighborDomCells=[];
  els.canvasSelectionMarker?.classList.remove("visible");
}
function syncSelectionDom(){
  clearSelectionDom();
  if(!state.selectedCell||!state.lastGrid||!inExtent(state.selectedCell.coord.lat,state.selectedCell.coord.lon,state.lastGrid.extent)){
    els.viewport?.classList.remove("selection-active");
    return false;
  }
  const p=coordToGrid(state.selectedCell.coord.lat,state.selectedCell.coord.lon,state.lastGrid.extent);
  const x=clamp(p.x,0,CONFIG.gridW-1),y=clamp(p.y,0,CONFIG.gridH-1);
  state.selectedCell.x=x;state.selectedCell.y=y;
  const selectedPoi=state.selectedCell.poiUid?normalizedPoiByUid(state.selectedCell.poiUid):null;
  state.selectedCell.feature=selectedPoi?symbolicPoiFeatureInfo(selectedPoi):(state.lastGrid.grid[y]?.[x]?.feature||null);
  if(CANVAS_RENDERER){positionCanvasMarker(els.canvasSelectionMarker,x,y,true);els.viewport?.classList.add("selection-active");return true}
  const target=mapCellElement(x,y);
  if(!target){els.viewport?.classList.remove("selection-active");return false}
  target.classList.add("selected");selectedDomCell=target;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const neighbor=mapCellElement(x+dx,y+dy);if(neighbor){neighbor.classList.add("selection-neighbor");selectionNeighborDomCells.push(neighbor)}
  }
  els.viewport?.classList.add("selection-active");return true;
}
function closeSelectionAssist(){
  state.selectionAssistVisible=false;
  updateSelectionAssist();
}
function cellSelectionSound(cell){
  const f=cell?.feature||{},cls=String(cell?.cls||""),tags=f.tags||{};
  const normalized={cavity:"cellCavity",bss:"cellBss",heritage:"cellHeritage",memory:"cellMemory",industrial:"cellIndustrial",home:"cellHome",location:"cellLocation",natural:"cellTerrain"}[f.poiCategory];
  if(normalized)return normalized;
  const descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`.toLowerCase();
  if(currentDepth()<0||cell?.confidence)return "cellUnderground";
  if(f.kind==="maison"||cls.includes("house"))return "cellHome";
  if(f.cavity||/cavit|grotte|carri[eè]re souterraine|souterrain/.test(descriptor))return "cellCavity";
  if(f.bss||f.indice||/forage|sondage|puits|pi[eé]zo/.test(descriptor))return "cellBss";
  if(f.heritage)return "cellHeritage";
  if(f.observation||f.lore)return "cellMemory";
  if(f.cartofriches||f.siteType||f.siteStatus)return "cellIndustrial";
  if(cls.includes("quarry")||tags.landuse==="quarry"||/carri[eè]re|extraction/.test(descriptor))return "cellQuarry";
  if(cls.includes("water")||tags.waterway||tags.natural==="water"||tags.landuse==="reservoir")return "cellWater";
  if(cls.includes("road")||tags.highway)return "cellRoad";
  if(cls.includes("building")||cls.includes("cad-building")||tags.building)return "cellBuilding";
  if(cls.includes("forest")||["forest","wood"].includes(tags.landuse)||tags.natural==="wood")return "cellForest";
  if(cls.includes("field")||cls.includes("meadow")||["farmland","meadow","grass"].includes(tags.landuse))return "cellField";
  return "cellTerrain";
}
function playCellSelectionSound(cell,{snapped=false}={}){
  const poiKind=poiSelectionKind(cell);
  const poiSound={cavity:"poiCavity",bss:"poiBss",heritage:"poiHeritage",memory:"poiMemory",industrial:"poiIndustrial",natural:"poiNatural",home:"poiHome",location:"poiLocation"}[poiKind];
  retroAudio.play(poiSound||cellSelectionSound(cell));
  if(snapped)setTimeout(()=>retroAudio.play("snapAccent"),110);
}

function poiSelectionKind(cell){
  if(!cell)return "";
  const cls=String(cell.cls||""),f=cell.feature||{},tags=f.tags||{};
  if(f.poiCategory)return f.poiCategory;
  const descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`.toLowerCase();
  if(f.kind==="maison"||cls.includes("c-house")||cls.includes("c-address"))return "home";
  if(f.cavity||/cavit|grotte|souterrain/.test(descriptor))return "cavity";
  if(f.bss||f.indice||cls.includes("c-bss")||cls.includes("c-piezo"))return "bss";
  if(f.heritage||cls.includes("c-heritage"))return "heritage";
  if(f.cartofriches||cls.includes("c-carto")||cls.includes("c-lore-friche")||cls.includes("c-lore-abandoned"))return "industrial";
  if(f.observation||f.lore||cls.includes("c-observation")||cls.includes("c-lore")||cls.includes("c-sight")||cls.includes("c-zone"))return "memory";
  if(cls.includes("c-user-position"))return "location";
  if(["spring","sinkhole","cave_entrance"].includes(tags.natural)||cls.includes("c-doc")||cls.includes("c-demo")||cls.includes("c-explorer-hint"))return "natural";
  return "";
}
let pendingPoiFeedback=null,poiFeedbackTimer=0,poiFeedbackSerial=0;
function applyPendingPoiSelectionFeedback(){
  const pending=pendingPoiFeedback;if(!pending||!state.lastGrid)return;
  const remaining=pending.expires-performance.now();if(remaining<=0){pendingPoiFeedback=null;els.canvasPoiMarker?.classList.remove("active","visible");return}
  const p=coordToGrid(pending.coord.lat,pending.coord.lon,state.lastGrid.extent),x=clamp(p.x,0,CONFIG.gridW-1),y=clamp(p.y,0,CONFIG.gridH-1);
  if(CANVAS_RENDERER){
    const marker=els.canvasPoiMarker;positionCanvasMarker(marker,x,y,true);marker.dataset.poiKind=pending.kind;marker.classList.remove("active");void marker.offsetWidth;marker.classList.add("active");
    clearTimeout(poiFeedbackTimer);const serial=pending.serial;poiFeedbackTimer=setTimeout(()=>{if(pendingPoiFeedback?.serial!==serial)return;pendingPoiFeedback=null;marker.classList.remove("active","visible");delete marker.dataset.poiKind},Math.max(80,remaining));return;
  }
  const glyph=mapCellElement(x,y);if(!glyph)return;
  els.map.querySelectorAll(".cell.poi-hit-active").forEach(el=>{el.classList.remove("poi-hit-active");delete el.dataset.poiKind});
  glyph.dataset.poiKind=pending.kind;glyph.classList.remove("poi-hit-active");void glyph.offsetWidth;glyph.classList.add("poi-hit-active");
  clearTimeout(poiFeedbackTimer);const serial=pending.serial;poiFeedbackTimer=setTimeout(()=>{if(pendingPoiFeedback?.serial!==serial)return;pendingPoiFeedback=null;glyph.classList.remove("poi-hit-active");delete glyph.dataset.poiKind},Math.max(80,remaining));
}
function triggerPoiSelectionFeedback(cell,x,y,coordOverride=null){
  const selectionKind=poiSelectionKind(cell);
  if(!selectionKind||!state.lastGrid)return;
  pendingPoiFeedback={
    kind:selectionKind,
    coord:coordOverride||gridToCoord(x,y,state.lastGrid.extent),
    expires:performance.now()+1120,
    serial:++poiFeedbackSerial
  };
  requestAnimationFrame(applyPendingPoiSelectionFeedback);
}

function selectGridCell(x,y,{assist=false,assistRadius=null,note="",showAssist=false,confirmIfSame=false}={}){
  if(!state.lastGrid)return;
  x=clamp(Math.round(x),0,CONFIG.gridW-1);y=clamp(Math.round(y),0,CONFIG.gridH-1);
  const defaultRadius=state.zoomIndex===CONFIG.zooms.length-1&&effectiveRenderMode()==="symbolic"?2:(state.zoomIndex<=2?2:1);
  const picked=assist?assistedCell(x,y,Number.isFinite(assistRadius)?assistRadius:defaultRadius):{x,y,snapped:false};
  x=picked.x;y=picked.y;
  const sameSelection=!!state.selectedCell&&state.selectionAssistVisible&&state.selectedCell.x===x&&state.selectedCell.y===y;
  if(confirmIfSame&&sameSelection){
    closeSelectionAssist();
    els.readoutBody?.insertAdjacentHTML("beforeend",'<div class="small" style="margin-top:7px">Sélection validée.</div>');
    return;
  }
  const cell=state.lastGrid.grid[y][x];
  state.selectedCell={x,y,coord:gridToCoord(x,y,state.lastGrid.extent),feature:cell.feature||null};
  debugState.lastSelection=`${x}, ${y} · ${cell.feature?.name||cell.feature?.kind||"terrain"}`;
  state.selectionSnapNote=picked.snapped?`Sélection accrochée à ${cell.feature?.name||cell.feature?.kind||"un repère voisin"}.`:note;
  state.selectionAssistVisible=false;
  playCellSelectionSound(cell,{snapped:picked.snapped});
  syncSelectionDom();
  updateSelectionAssist();
  const poiKind=poiSelectionKind(cell);
  if(poiKind){
    triggerPoiSelectionFeedback(cell,x,y);
    const assistHint="";
    presentCellDescription(cell,x,y,{note:state.selectionSnapNote||"Sélection mémorisée",assistHint,title:cell.feature?.name||cell.feature?.kind||"Point d’intérêt",sheet:"full"});
  }else{
    collapseReadoutForPlainCell(cell,x,y);
  }
}
function moveSelection(dx,dy){
  if(!state.selectedCell||!state.lastGrid)return;
  const p=coordToGrid(state.selectedCell.coord.lat,state.selectedCell.coord.lon,state.lastGrid.extent);
  selectGridCell(p.x+dx,p.y+dy,{assist:false,note:"Sélection ajustée manuellement",showAssist:false});
}
function selectionLoupeHtml(x,y){
  if(!state.lastGrid)return "";
  const rows=[];
  for(let yy=y-2;yy<=y+2;yy++){
    let row="";
    for(let xx=x-2;xx<=x+2;xx++){
      const ch=state.lastGrid.grid[yy]?.[xx]?.ch||" ";
      row+=(xx===x&&yy===y)?`<strong>${esc(ch===" "?"·":ch)}</strong>`:esc(ch===" "?"·":ch);
    }
    rows.push(row);
  }
  return rows.join("\n");
}
function updateSelectionAssist(){
  state.selectionAssistVisible=false;
  if(els.selectionAssist)els.selectionAssist.hidden=true;
}

function storyChoice(seed,items){return items[Math.abs(seed)%items.length]}
function cardinalDirection(bearing){
  if(!Number.isFinite(bearing))return "";
  return ["nord","nord-est","est","sud-est","sud","sud-ouest","ouest","nord-ouest"][Math.round(((bearing%360)+360)%360/45)%8];
}
function localSlopeProfile(x,y){
  const g=state.lastGrid;if(!g)return null;const z=currentZoom();
  const l=g.elevations[y]?.[Math.max(0,x-1)],r=g.elevations[y]?.[Math.min(CONFIG.gridW-1,x+1)],u=g.elevations[Math.max(0,y-1)]?.[x],d=g.elevations[Math.min(CONFIG.gridH-1,y+1)]?.[x];
  if(![l,r,u,d].every(Number.isFinite))return null;
  const dx=z.widthKm*1000/Math.max(1,CONFIG.gridW-1)*2,dy=z.heightKm*1000/Math.max(1,CONFIG.gridH-1)*2;
  const eastGradient=(r-l)/dx,southGradient=(d-u)/dy;
  const angle=Math.atan(Math.hypot(eastGradient,southGradient))*180/Math.PI;
  const downEast=-eastGradient,downNorth=southGradient;
  const bearing=(Math.atan2(downEast,downNorth)*180/Math.PI+360)%360;
  return {angle,bearing,direction:cardinalDirection(bearing)};
}
function localSlopeDegrees(x,y){return localSlopeProfile(x,y)?.angle??null}
function terrainPhrase(cell,slope,x,y){
  const seed=x*37+y*71,profile=localSlopeProfile(x,y),direction=profile?.direction;
  if(currentDepth()<0)return storyChoice(seed,[
    `Sous la surface, cette case appartient à la coupe interprétative ${depthSliceLabel()}. Le dessin est une section d’un même volume hypothétique, pas une galerie levée sur le terrain.`,
    `À ${depthSliceLabel()}, l’Atlas montre une possibilité spatiale cohérente entre les niveaux. La profondeur locale et la forme exacte restent inconnues.`,
    `Cette tranche souterraine prolonge un modèle de lecture. Elle aide à comparer les couches, mais ne peut servir ni d’itinéraire ni de plan topographique.`
  ]);
  const cls=cell.cls||"";
  if(cls.includes("water"))return storyChoice(seed,[
    "L’eau donne ici sa direction au paysage. Le cours visible relie naturellement cette case aux points situés en amont et en aval.",
    "Le réseau hydrographique traverse la cellule et constitue le repère le plus net de sa lecture.",
    "Cette case appartient au corridor humide du territoire ; relief, végétation et chemins tendent à s’organiser autour de lui."
  ]);
  if(cls.includes("road"))return storyChoice(seed,[
    "Une voie traverse la cellule et impose une lecture linéaire du lieu, davantage tournée vers le passage que vers l’épaisseur du terrain.",
    "La circulation structure ici la carte : le tracé relie les espaces voisins et coupe les motifs naturels de la surface."
  ]);
  if(cls.includes("building")||cls.includes("cad-building"))return storyChoice(seed,[
    "Le bâti occupe la cellule. La trame devient plus précise, mais ce contour cadastral ne raconte ni l’usage actuel ni l’état du bâtiment.",
    "Ici, le paysage se resserre autour d’une construction documentée par son emprise, sans que l’Atlas prétende connaître ce qui se passe derrière les murs."
  ]);
  if(cls.includes("forest"))return storyChoice(seed,[
    "La couverture boisée domine la cellule. Elle donne une continuité au paysage tout en rendant les détails du sol plus difficiles à lire.",
    "Cette case se fond dans une masse forestière : les ruptures de pente et les anciens tracés y deviennent plus discrets."
  ]);
  if(cls.includes("quarry"))return "La surface porte la marque d’une extraction ou d’un terrain remanié. Ce signal décrit l’usage du sol ; il ne suffit pas à prouver une exploitation souterraine.";
  if(cls.includes("field")||cls.includes("meadow"))return storyChoice(seed,[
    "La cellule s’ouvre sur un espace cultivé ou herbacé. Les limites, chemins et inflexions du relief y deviennent plus faciles à suivre.",
    "Le terrain est ici peu masqué : la géométrie des parcelles et la pente prennent davantage de présence dans la lecture."
  ]);
  if(Number.isFinite(slope)){
    const tail=direction?` La pente semble s’abaisser vers le ${direction}.`:"";
    if(slope<1.5)return storyChoice(seed,["Le relief paraît presque immobile ici.","La surface est remarquablement calme à l’échelle de la grille."])+tail;
    if(slope<5)return storyChoice(seed,["Le terrain s’incline doucement, sans rupture marquée.","Une pente légère donne une direction au lieu sans le brusquer."])+tail;
    if(slope<11)return storyChoice(seed,["La pente devient lisible et commence à gouverner la forme du lieu.","Le relief prend ici une présence nette, suffisante pour orienter écoulements et parcours."])+tail;
    return storyChoice(seed,["La déclivité est franche : cette case appartient à une rupture de relief notable.","Le terrain se cabre ici ; toute interprétation du sous-sol doit d’abord tenir compte de cette rupture."])+tail;
  }
  return "Aucun objet nommé ne domine cette case. Elle demeure néanmoins une pièce du relief, utile pour comprendre les continuités entre les lieux voisins.";
}
function featureNarrative(f){
  if(!f)return "";
  const name=f.name?` <strong>${esc(f.name)}</strong>`:"";
  const descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`;
  if(f.cavity||/cavit|grotte|carri[eè]re|souterrain/i.test(descriptor)){
    const depth=Number.isFinite(f.depth)?` Une profondeur de ${Math.abs(f.depth)} m est déclarée dans la fiche ; elle ne décrit pas à elle seule toute l’enveloppe de la cavité.`:" Sa profondeur et son développement ne sont pas suffisamment documentés dans l’Atlas.";
    return `Un repère souterrain documenté apparaît ici :${name||" un ouvrage sans nom lisible"}.${depth}`;
  }
  if(f.bss||f.indice||/forage|sondage|puits|pi[eé]zo/i.test(`${f.kind||""} ${f.nature||""}`)){
    const nature=f.nature?` Il s’agit d’un ${esc(String(f.nature).toLowerCase())}.`:"";
    const depth=Number.isFinite(f.depth)?` La profondeur finale annoncée est de ${Math.abs(f.depth)} m.`:"";
    return `La Banque du sous-sol signale ici${name||" un ouvrage"}.${nature}${depth} Ce point renseigne verticalement le secteur, sans prouver l’existence d’une galerie accessible.`;
  }
  if(f.observation){
    const confidence=f.confidenceLabel?` Son niveau de confiance est ${esc(f.confidenceLabel)}.`:"";
    const season=f.season?` Elle est associée à ${esc(f.season)}.`:"";
    return `Une observation locale a été déposée ici :${name}.${confidence}${season} Elle reste volontairement distincte d’une donnée institutionnelle.`;
  }
  if(f.heritage){
    const excerpt=String(f.description||"").replace(/\s+/g," ").trim();
    const lead=f.heritageCategory==="monument"?"Une notice patrimoniale officielle signale ici":f.heritageCategory==="garden"?"Le label Jardin remarquable distingue ici":f.heritageCategory==="house"?"Le label Maison des Illustres rattache ce lieu à":f.heritageCategory==="museum"?"Un Musée de France est localisé ici :":"Une page géolocalisée documente ici";
    const context=[f.period&&`période ${esc(f.period)}`,f.protection&&esc(f.protection)].filter(Boolean).join(" · ");
    return `${lead}${name||" un lieu notable"}.${context?` <span class="cell-source-line">${context}</span>`:""}${excerpt?` <span class="heritage-excerpt">${esc(excerpt.slice(0,360))}${excerpt.length>360?"…":""}</span>`:" La source confirme le lieu, mais l’Atlas n’invente pas son histoire manquante."}`;
  }
  if(f.lore)return `Ce point appartient à la mémoire locale de l’Atlas :${name}. Il conserve une trace, une ambiance ou une piste de recherche sans prendre la place d’une source officielle.`;
  if(f.cartofriches||f.siteType||f.siteStatus){
    const status=f.siteStatus?` Son statut est « ${esc(f.siteStatus)} ».`:"";
    const activity=f.activity?` L’activité mentionnée est ${esc(f.activity)}.`:"";
    return `La couche Cartofriches rattache cette case à${name||" un site recensé"}.${status}${activity} Cette notice décrit une trajectoire foncière ou industrielle, pas le sous-sol.`;
  }
  if(f.tags?.natural==="spring")return `Une source est cartographiée ici${name}. Sa présence signale un contact visible avec l’eau, mais ne permet pas à elle seule de reconstruire le réseau souterrain qui l’alimente.`;
  if(f.tags?.place)return `La carte nomme ici${name||` ${esc(f.kind||"un lieu")}`}. Ce toponyme sert de repère spatial ; il ne constitue pas en soi une description du site.`;
  return `La carte associe cette case à${name||` ${esc(f.kind||"un objet cartographique")}`}. La fiche conserve les attributs disponibles sans leur prêter davantage de précision qu’ils n’en ont.`;
}
function evidenceProfile(cell){
  const f=cell?.feature||{};
  const documented=!!(f.source||f.bss||f.cavity||f.heritage||f.cartofriches||f.tags||f.id);
  const observed=!!(f.observation||f.lore||f.confidenceLabel);
  const hypothesis=currentDepth()<0||!!cell?.confidence||!!f.hypothesisModel;
  return {documented,observed,interpreted:true,hypothesis};
}
function readingLedgerHtml(cell){
  const p=evidenceProfile(cell),chip=(cls,label,on)=>`<span class="reading-chip ${cls}${on?" active":""}">${label}</span>`;
  return `<div class="cell-reading-ledger" aria-label="Nature de la lecture">${chip("documented","fait",p.documented)}${chip("observed","observation",p.observed)}${chip("interpreted","interprétation",p.interpreted)}${chip("hypothesis","hypothèse",p.hypothesis)}</div>`;
}
function criticalReading(cell){
  const f=cell?.feature||{},descriptor=`${f.kind||""} ${f.type||""} ${f.nature||""}`.toLowerCase();
  if(currentDepth()<0)return "La coupe aide à comparer les niveaux et à garder une continuité spatiale. Elle ne permet pas d’affirmer qu’une galerie passe sous cette cellule, ni que la profondeur affichée est mesurée localement.";
  if(f.bss||f.indice||/forage|sondage|puits|pi[eé]zo/.test(descriptor))return "Cet ouvrage décrit un point vertical du sous-sol. Il peut éclairer la nature ou l’épaisseur des terrains traversés, mais il ne transforme pas le voisinage en cavité connue.";
  if(f.cavity||/cavit|grotte|souterrain/.test(descriptor))return "La présence du repère est documentée. En revanche, l’emprise, les accès, la stabilité et les connexions éventuelles restent inconnus tant qu’aucun plan ou levé local ne les établit.";
  if(f.heritage)return "La notice permet d’identifier et de contextualiser le lieu. Elle ne prouve pas que chaque détail historique, chaque dépendance ou chaque état du bâtiment soit encore observable aujourd’hui.";
  if(f.observation||f.lore)return "Cette information enrichit l’enquête locale. Sa valeur dépend de sa date, de sa précision et de la possibilité de la recouper avec une autre source.";
  if(f.cartofriches||f.siteType)return "Le statut du site renseigne son histoire d’usage. Il ne suffit pas à conclure sur une pollution, une accessibilité ou une structure souterraine particulière.";
  return "Ici, l’Atlas décrit surtout un contexte de terrain. Toute conclusion plus précise demanderait une source dédiée, une observation datée ou une mesure locale.";
}
function poiCategoryLabel(category){return {cavity:"cavité",bss:"ouvrage du sous-sol",heritage:"patrimoine",memory:"mémoire locale",industrial:"site anthropisé",natural:"repère naturel",home:"maison",location:"position"}[category]||"repère"}
function nearbyEntries(x,y){
  if(!state.lastGrid)return [];
  const center=gridToCoord(x,y,state.lastGrid.extent),z=currentZoom();
  const latRadius=(z.heightKm/111.32/Math.max(1,CONFIG.gridH-1))*7;
  const lonRadius=(z.widthKm/kmPerLon(center.lat)/Math.max(1,CONFIG.gridW-1))*7;
  const extent={west:center.lon-lonRadius,east:center.lon+lonRadius,south:center.lat-latRadius,north:center.lat+latRadius};
  const current=state.lastGrid.grid[y]?.[x]?.feature,currentId=current?.poiId||current?.id;
  const seen=new Set(),out=[];
  for(const p of queryNormalizedPois(extent).filter(p=>p.title&&p.uid!==currentId).sort((a,b)=>distanceMeters(center,a)-distanceMeters(center,b))){
    const key=p.uid||`${p.category}:${p.title}`;if(seen.has(key))continue;seen.add(key);
    const distance=Math.round(distanceMeters(center,p)),bearing=bearingDegrees(center,p);
    out.push({title:p.title,distance,bearing,direction:cardinalDirection(bearing),category:p.category});
    if(out.length>=3)break;
  }
  if(!out.length){
    for(let r=1;r<=5&&out.length<3;r++)for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++){
      if(Math.max(Math.abs(xx-x),Math.abs(yy-y))!==r)continue;
      const f=state.lastGrid.grid[yy]?.[xx]?.feature;if(!f||!f.name)continue;
      const key=f.poiId||f.id||`${f.kind}:${f.name}`;if(seen.has(key))continue;seen.add(key);
      const coord=gridToCoord(xx,yy,state.lastGrid.extent),distance=Math.round(distanceMeters(center,coord)),bearing=bearingDegrees(center,coord);
      out.push({title:f.name,distance,bearing,direction:cardinalDirection(bearing),category:f.poiCategory||poiSelectionKind({feature:f,cls:state.lastGrid.grid[yy]?.[xx]?.cls})||"natural"});
      if(out.length>=3)break;
    }
  }
  return out;
}
function nearbyNarrative(x,y){
  const entries=nearbyEntries(x,y);if(!entries.length)return "";
  return `<ul class="cell-nearby-list">${entries.map(e=>`<li><strong>${esc(e.title)}</strong><div class="cell-nearby-distance">${poiCategoryLabel(e.category)} · environ ${e.distance<50?"moins de 50":Math.round(e.distance/10)*10} m${e.direction?` vers le ${e.direction}`:""}</div></li>`).join("")}</ul>`;
}
function technicalCellLines(cell,x,y){
  const c=gridToCoord(x,y,state.lastGrid.extent),parts=[];
  parts.push(`<strong>Case ${x}, ${y}</strong> · ${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`);
  if(Number.isFinite(cell.elev)){const slope=localSlopeDegrees(x,y);parts.push(`Altitude interpolée : <strong>${Math.round(cell.elev)} m</strong>${Number.isFinite(slope)?` · pente locale ≈ ${slope.toFixed(1)}°`:""}`)}
  if(cell.feature){
    const f=cell.feature;
    parts.push(`Lecture : <strong>${esc(f.kind||"objet cartographique")}</strong>${f.name?` · ${esc(f.name)}`:""}`);
    if(f.id)parts.push(`Identifiant : <code>${esc(f.id)}</code>`);
    if(f.type)parts.push(`Type source : ${esc(f.type)}${f.detail?` · ${esc(f.detail)}`:""}`);
    if(f.position||f.precision)parts.push(`Positionnement : ${esc(f.position||"non précisé")}${f.precision?` · précision annoncée ${f.precision} m`:""}`);
    if(Number.isFinite(f.altitude))parts.push(`Altitude de la fiche : ${f.altitude} m`);
    if(Number.isFinite(f.depth))parts.push(`Profondeur déclarée / finale : <strong>${f.depth} m</strong>`);
    if(f.nature)parts.push(`Nature de l’ouvrage : ${esc(f.nature)}`);
    if(f.commune)parts.push(`Commune : ${esc(f.commune)}`);
    if(f.indice)parts.push(`Indice BSS : ${esc(f.indice)}`);
    if(f.place)parts.push(`Lieu-dit : ${esc(f.place)}`);
    if(f.record?.coordinateSource)parts.push(`Coordonnées : ${esc(f.record.coordinateSource)}`);
    if(f.season)parts.push(`Saison / date d’observation : ${esc(f.season)}`);
    if(f.categoryLabel)parts.push(`Catégorie : <strong>${esc(f.categoryLabel)}</strong>`);
    if(f.siteType)parts.push(`Type Cartofriches : <strong>${esc(f.siteType)}</strong>`);
    if(f.siteStatus)parts.push(`Statut Cartofriches : <strong>${esc(f.siteStatus)}</strong>`);
    if(f.address)parts.push(`Adresse : ${esc(f.address)}`);
    if(Number.isFinite(f.surface))parts.push(`Surface du site : ${Math.round(f.surface).toLocaleString("fr-FR")} m²`);
    if(f.activity)parts.push(`Ancienne activité : ${esc(f.activity)}${f.activityEnd?` · fin signalée ${esc(f.activityEnd)}`:""}`);
    if(f.occupation)parts.push(`Occupation : ${esc(f.occupation)}`);
    if(f.security)parts.push(`Sécurisation : ${esc(f.security)}`);
    if(f.pollution)parts.push(`Pollution / état environnemental : ${esc(f.pollution)}`);
    if(f.updated)parts.push(`Dernière actualisation signalée : ${esc(f.updated)}`);
    if(f.producer)parts.push(`Producteur Cartofriches : ${esc(f.producer)}`);
    if(f.period)parts.push(`Période / couche historique : ${esc(f.period)}`);
    if(f.reference)parts.push(`Référence patrimoniale : <code>${esc(f.reference)}</code>`);
    if(f.protection)parts.push(`Protection / label : ${esc(f.protection)}`);
    if(f.license)parts.push(`Licence : ${esc(f.license)}`);
    if(f.description&&f.heritage)parts.push(`Notice : ${esc(String(f.description).slice(0,900))}`);
    if(f.url&&f.heritage){const href=safeExternalUrl(f.url);if(href)parts.push(`<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">ouvrir la notice source ↗</a>`)}
    if(f.note)parts.push(`Note : ${esc(f.note)}`);
    if(Number.isFinite(f.bearing))parts.push(`Visée : ${f.bearing.toFixed(0)}° · distance estimée ${Math.round(f.distance||0)} m`);
    if(f.confidenceLabel)parts.push(`Confiance de l’observation : <strong>${esc(f.confidenceLabel)}</strong>`);
    if(f.comments)parts.push(`Commentaire source : ${esc(f.comments).slice(0,360)}`);
    if(cell.confidence)parts.push(`Confiance du volume affiché : <strong>${cell.confidence==="high"?"forte":cell.confidence==="med"?"moyenne":"faible"}</strong>`);
    if(f.source)parts.push(`Source : ${esc(f.source)}`);
  }else parts.push("Aucun objet précis n’est associé à cette case.");
  if(currentDepth()<0)parts.push("La forme souterraine visible appartient au modèle d’extrapolation, sauf les marqueurs explicitement documentés.");
  return parts;
}
function cellPresentationCategory(cell){
  const key=cellSelectionSound(cell);
  const categories={
    cellWater:["Milieu aquatique","≈"],cellForest:["Couverture boisée","T"],cellField:["Espace ouvert",cell?.cls?.includes("meadow")?",":"."],
    cellRoad:["Voie et circulation","─"],cellBuilding:["Bâti","█"],cellQuarry:["Terrain d’extraction","q"],cellCavity:["Repère souterrain","A#"],
    cellBss:["Donnée du sous-sol","B•"],cellHeritage:["Patrimoine documenté","MH"],cellMemory:["Mémoire locale","◎"],cellIndustrial:["Site anthropisé","F"],
    cellHome:["Repère privé","⌂"],cellUnderground:["Interprétation souterraine","▓"],cellTerrain:["Lecture du terrain",symbolForCell(cell)]
  };
  return categories[key]||categories.cellTerrain;
}
function documentedCellFacts(cell){
  const f=cell.feature,facts=[];
  if(f){
    facts.push(`<span class="cell-fact-kind">source</span><strong>${esc(f.kind||f.type||"Objet cartographique")}</strong>${f.name?` : ${esc(f.name)}`:""}`);
    if(f.protection)facts.push(`<span class="cell-fact-kind">statut</span>${esc(f.protection)}`);
    if(f.categoryLabel)facts.push(`<span class="cell-fact-kind">catégorie</span>${esc(f.categoryLabel)}`);
    if(f.siteStatus)facts.push(`<span class="cell-fact-kind">état</span>${esc(f.siteStatus)}`);
    if(Number.isFinite(f.depth))facts.push(`<span class="cell-fact-kind">mesure</span>Profondeur déclarée : ${f.depth} m`);
    if(f.confidenceLabel)facts.push(`<span class="cell-fact-kind">confiance</span>${esc(f.confidenceLabel)}`);
    if(f.source)facts.push(`<span class="cell-fact-kind">origine</span>${esc(f.source)}`);
  }else facts.push("Aucun repère ponctuel n’est attaché à cette case ; la lecture repose sur le terrain et les couches de surface.");
  if(currentDepth()<0)facts.push(`<span class="cell-fact-kind">prudence</span>Le volume souterrain affiché est une extrapolation, sauf marqueur explicitement documenté.`);
  return facts;
}
function featureDescriptionFingerprint(f){
  if(!f)return "none";
  return [f.poiId,f.id,f.indice,f.name,f.kind,f.type,f.nature,f.source,f.updated,f.depth,f.confidenceLabel,f.siteStatus,f.period].map(v=>String(v??"").slice(0,80)).join("~");
}
function cellDescriptionCacheKey(cell,x,y){
  const coord=gridToCoord(x,y,state.lastGrid.extent),slope=localSlopeDegrees(x,y);
  return [descriptionRuntime.revision,state.zoomIndex,state.depthIndex,state.scenario,CONFIG.gridW,CONFIG.gridH,coord.lat.toFixed(6),coord.lon.toFixed(6),cell.ch,cell.cls,Number.isFinite(cell.elev)?Math.round(cell.elev):"",Number.isFinite(slope)?slope.toFixed(1):"",featureDescriptionFingerprint(cell.feature)].join("|");
}
function trimDescriptionCache(){
  while(descriptionRuntime.cache.size>descriptionRuntime.maxEntries){
    const first=descriptionRuntime.cache.keys().next().value;descriptionRuntime.cache.delete(first);
  }
}
function buildCellDescriptionBundle(cell,x,y){
  const slope=localSlopeDegrees(x,y),f=cell.feature;
  const title=f?.name||f?.kind||"Case sans nom";
  const terrain=terrainPhrase(cell,slope,x,y),feature=featureNarrative(f);
  const meta=[Number.isFinite(cell.elev)?`altitude ≈ ${Math.round(cell.elev)} m`:"",Number.isFinite(slope)?`pente ≈ ${slope.toFixed(1)}°`:"",currentDepth()<0?`niveau ${depthSliceLabel()}`:"surface"].filter(Boolean).join(" · ");
  const [category,symbol]=cellPresentationCategory(cell);
  const immediate=`<article class="cell-sheet-card">
    <header class="cell-sheet-head"><div class="cell-sheet-symbol">${esc(symbol)}</div><div><div class="cell-sheet-kicker">${esc(category)}</div><div class="cell-sheet-title">${esc(title)}</div><div class="cell-sheet-meta">${esc(meta)}</div>${documentarySignalHtml(cell)}${readingLedgerHtml(cell)}</div></header>
    <section class="cell-section cell-section-reading"><h3>Lecture du lieu</h3><p>${terrain}${feature?` ${feature}`:""}</p></section>`;
  return {key:cellDescriptionCacheKey(cell,x,y),immediate,cell,x,y,title,details:null};
}
function buildCellDescriptionDetails(bundle){
  if(bundle.details)return bundle.details;
  const {cell,x,y}=bundle,facts=documentedCellFacts(cell),nearby=nearbyNarrative(x,y),relations=relationsNarrative(cell,x,y),critical=criticalReading(cell);
  bundle.details=`<section class="cell-section"><h3>Ce qui est documenté</h3><ul class="cell-facts">${facts.map(v=>`<li>${v}</li>`).join("")}</ul></section>
    ${nearby?`<section class="cell-section cell-section-nearby"><h3>À proximité</h3>${nearby}</section>`:""}
    ${relations}
    <section class="cell-section cell-section-critical"><h3>Ce que l’on peut en déduire</h3><p><strong>Lecture prudente.</strong> ${critical}</p></section>
    <details class="technical-details"><summary>Données techniques et sources</summary><div>${technicalCellLines(cell,x,y).join("<br>")}</div></details>`;
  return bundle.details;
}
function getCellDescriptionBundle(cell,x,y){
  const key=cellDescriptionCacheKey(cell,x,y),cached=descriptionRuntime.cache.get(key);
  if(cached){descriptionRuntime.hits++;descriptionRuntime.cache.delete(key);descriptionRuntime.cache.set(key,cached);return cached}
  descriptionRuntime.misses++;
  const bundle=buildCellDescriptionBundle(cell,x,y);descriptionRuntime.cache.set(key,bundle);trimDescriptionCache();return bundle;
}
function presentCellDescription(cell,x,y,{note="",assistHint="",title="Case sélectionnée",sheet="full"}={}){
  const bundle=getCellDescriptionBundle(cell,x,y),token=++descriptionRuntime.selectionToken;
  descriptionRuntime.lastKey=bundle.key;
  const footer=`<div class="readout-note"><span>▹</span><span>${esc(note||"Sélection mémorisée")}.${assistHint}</span></div>`;
  const placeholder=`<div class="cell-deferred is-loading" data-cell-details-token="${token}">Lecture documentaire en cours…</div>`;
  setReadoutContent(`${bundle.immediate}${placeholder}</article>${footer}`,{title,sheet,kind:"poi"});
  const hydrate=()=>{
    if(token!==descriptionRuntime.selectionToken)return;
    const target=els.readoutBody?.querySelector(`[data-cell-details-token="${token}"]`);if(!target)return;
    const details=buildCellDescriptionDetails(bundle);
    target.outerHTML=`<div class="cell-deferred">${details}</div>`;
    requestAnimationFrame(prepareReadoutSections);
  };
  if(bundle.details)requestAnimationFrame(hydrate);
  else if("requestIdleCallback" in window)requestIdleCallback(hydrate,{timeout:180});
  else setTimeout(hydrate,24);
}
function cellDescription(cell,x,y){
  const bundle=getCellDescriptionBundle(cell,x,y);
  return `${bundle.immediate}<div class="cell-deferred">${buildCellDescriptionDetails(bundle)}</div></article>`;
}

function symbolForCell(cell){
  const f=cell.feature;
  if(f?.cavity)return cavityMarker(f.record||f).glyph;
  const ch=cell.ch===" "?"∅":cell.ch;
  return ch;
}
function featureTagSummary(f){
  if(!f?.tags)return "";
  const keys=["highway","waterway","landuse","natural","building","surface","ref","place"];
  return keys.filter(k=>f.tags[k]).map(k=>`${k}=${f.tags[k]}`).join(" · ");
}
function hoverDescription(cell,x,y){
  const c=gridToCoord(x,y,state.lastGrid.extent),f=cell.feature;
  const title=f?.name||f?.kind||"case sans objet nommé";
  const kind=f?.kind||"aucun objet cartographique précis";
  const confidence=cell.confidence?`hypothèse ${cell.confidence==="high"?"forte":cell.confidence==="med"?"moyenne":"faible"}`:"";
  const tags=featureTagSummary(f),slope=localSlopeDegrees(x,y);
  const extra=[
    Number.isFinite(f?.depth)?`prof. ${f.depth} m`:"",
    f?.confidenceLabel?`confiance ${f.confidenceLabel}`:"",
    f?.categoryLabel?`cat. ${f.categoryLabel}`:"",
    f?.siteType?f.siteType:"",
    f?.siteStatus?f.siteStatus:"",
    Number.isFinite(f?.surface)?`${Math.round(f.surface).toLocaleString("fr-FR")} m²`:"",
    f?.period?`période ${f.period}`:"",
    Number.isFinite(f?.bearing)?`visée ${Math.round(f.bearing)}° / ${Math.round(f.distance||0)} m`:"",
    f?.season||"",f?.note?f.note:""
  ].filter(Boolean).join(" · ");
  const description=f?.heritage&&f?.description?`${String(f.description).replace(/\s+/g," ").slice(0,180)}${String(f.description).length>180?"…":""}`:"";
  const source=f?.source||"Atlas local · cellule cartographique";
  const sourceMode=f?.source?"REPÈRE DOCUMENTÉ":"CELLULE";
  const position=`${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`;
  const relief=Number.isFinite(cell.elev)?`≈ ${Math.round(cell.elev)} m${Number.isFinite(slope)?` · ${slope.toFixed(1)}°`:""}`:"non renseigné";
  const detail=[confidence,tags,extra,description].filter(Boolean).join(" · ");
  return `
    <div class="tip-kicker"><span>LOCAL SCAN // SURVOL</span><strong>${esc(sourceMode)}</strong></div>
    <div class="tip-head">
      <code class="tip-symbol">${esc(symbolForCell(cell))}</code>
      <div><span class="tip-name">${esc(title)}</span><span class="tip-kind">${esc(kind)}</span></div>
    </div>
    <div class="tip-data">
      <span><b>Relief</b>${esc(relief)}</span>
      <span><b>Position</b>${esc(position)}</span>
    </div>
    ${detail?`<div class="tip-detail">${esc(detail)}</div>`:""}
    <div class="tip-source">${esc(source)}</div>
    <div class="tip-action">clic → ouvrir la fiche complète</div>
  `;
}
const HOVER_DWELL_MS=320;
let hoveredKey="",hoverCandidateKey="",hoverCandidate=null,hoverDwellTimer=0;
function hideHover(){
  clearTimeout(hoverDwellTimer);hoverDwellTimer=0;hoverCandidate=null;hoverCandidateKey="";hoveredKey="";
  els.hoverTip.classList.remove("visible");
  els.hoverCellIndicator?.classList.remove("visible");els.canvasHoverMarker?.classList.remove("visible");
}
function positionHoverTipBesideRect(r){
  const pad=12,offset=11;
  const tipRect=els.hoverTip.getBoundingClientRect();
  let left=r.right+offset,top=r.top-Math.min(6,tipRect.height*.12);
  if(left+tipRect.width>window.innerWidth-pad)left=r.left-tipRect.width-offset;
  if(top+tipRect.height>window.innerHeight-pad)top=r.bottom-tipRect.height;
  top=Math.round(clamp(top,pad,Math.max(pad,window.innerHeight-tipRect.height-pad)));
  left=Math.round(clamp(left,pad,Math.max(pad,window.innerWidth-tipRect.width-pad)));
  els.hoverTip.style.transform="none";
  els.hoverTip.style.left=`${left}px`;
  els.hoverTip.style.top=`${top}px`;
}
function positionHoverTipBesideCell(target){positionHoverTipBesideRect(target.getBoundingClientRect())}
function revealCanvasHoverCandidate(){
  hoverDwellTimer=0;const candidate=hoverCandidate;
  if(!candidate||state.placingHouse||drag||pinch||!state.lastGrid)return;
  if(candidate.poiUid){
    const poi=normalizedPoiByUid(candidate.poiUid),region=canvasRuntime.symbolicPoiHitRegions?.find(v=>v.poi.uid===candidate.poiUid);if(!poi||!region)return;
    const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent),base=state.lastGrid.grid[p.y]?.[p.x];if(!base)return;
    const cell={...base,feature:symbolicPoiFeatureInfo(poi),cls:`${base.cls||""} c-symbolic-poi`};hoveredKey=candidate.key;els.hoverTip.innerHTML=hoverDescription(cell,p.x,p.y);els.hoverTip.classList.add("visible");
    const rect=symbolicPoiRegionClientRect(region);if(rect)positionHoverTipBesideRect(rect);return;
  }
  const pos=mapPositionFromClient(candidate.clientX,candidate.clientY);if(!pos||`${pos.x}:${pos.y}`!==candidate.key)return;
  const cell=state.lastGrid.grid[pos.y]?.[pos.x];if(!cell||(cell.ch===" "&&!cell.feature))return;
  hoveredKey=candidate.key;els.hoverTip.innerHTML=hoverDescription(cell,pos.x,pos.y);els.hoverTip.classList.add("visible");
  const rect=canvasCellRect(pos.x,pos.y);if(rect)positionHoverTipBesideRect(rect);
}
function scheduleCanvasHover(pos,ev){
  if(!pos||ev.pointerType!=="mouse"||state.placingHouse||drag||pinch)return;
  const hit=symbolicPoiHitFromClient(ev.clientX,ev.clientY,1.05);
  const px=hit?coordToGrid(hit.poi.lat,hit.poi.lon,state.lastGrid.extent):pos;
  positionCanvasMarker(els.canvasHoverMarker,px.x,px.y,true);
  const key=hit?`poi:${hit.poi.uid}`:`${pos.x}:${pos.y}`;if(key===hoverCandidateKey)return;
  clearTimeout(hoverDwellTimer);els.hoverTip.classList.remove("visible");hoveredKey="";hoverCandidateKey=key;
  hoverCandidate={key,clientX:ev.clientX,clientY:ev.clientY,poiUid:hit?.poi.uid||""};hoverDwellTimer=setTimeout(revealCanvasHoverCandidate,HOVER_DWELL_MS);
}
function revealHoverCandidate(){
  hoverDwellTimer=0;
  const candidate=hoverCandidate;
  if(!candidate||state.placingHouse||drag||pinch||!state.lastGrid)return;
  const target=cellElementAtClient(candidate.clientX,candidate.clientY);
  if(!target||target!==candidate.target)return;
  const x=+target.dataset.x,y=+target.dataset.y,cell=state.lastGrid.grid[y]?.[x];
  if(!cell||(cell.ch===" "&&!cell.feature))return;
  const key=`${x}:${y}`;hoveredKey=key;
  els.hoverTip.innerHTML=hoverDescription(cell,x,y);
  els.hoverTip.classList.add("visible");
  positionHoverTipBesideCell(target);
}
function scheduleHover(target,ev){
  if(!target||ev.pointerType&&ev.pointerType!=="mouse"||state.placingHouse||drag||pinch)return;
  const key=`${target.dataset.x}:${target.dataset.y}`;
  if(key===hoveredKey&&els.hoverTip.classList.contains("visible"))return;
  if(key===hoverCandidateKey)return;
  clearTimeout(hoverDwellTimer);
  els.hoverTip.classList.remove("visible");hoveredKey="";
  hoverCandidateKey=key;hoverCandidate={target,clientX:ev.clientX,clientY:ev.clientY};
  hoverDwellTimer=setTimeout(revealHoverCandidate,HOVER_DWELL_MS);
}
function saveHousePosition(coord,sourceLabel="placement manuel",persist=true){
  CONFIG.house={lat:+coord.lat,lon:+coord.lon};markSpatialIndexesDirty();
  if(els.houseLat){els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7)}
  if(persist){HOUSE_WAS_SAVED=true;try{localStorage.setItem("atlas-karst-house-v06",JSON.stringify(CONFIG.house));localStorage.removeItem("atlas-karst-house-v05")}catch{}}
  state.placingHouse=false;activeMapSurface()?.classList.remove("placing-house");
  els.placeHouse.classList.remove("active");
  els.houseHelp.innerHTML=`Repère enregistré : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong> · ${sourceLabel}.`;
  hideHover();render();
}
function setHousePlacement(active){
  state.placingHouse=active;els.placeHouse.classList.toggle("active",active);activeMapSurface()?.classList.toggle("placing-house",active);
  hideHover();
  els.houseHelp.innerHTML=active?'<span class="house-placement-note">Clique maintenant l’emplacement de la maison sur la carte. Le glisser-déposer est temporairement désactivé.</span>':`Repère actuel : <strong>${CONFIG.house.lat.toFixed(6)}, ${CONFIG.house.lon.toFixed(6)}</strong>.`;
}

function downloadBlob(content,type,filename){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function buildAtlasSnapshot(){
  const layerKeys=["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion"];
  return {
    format:"atlas-karst-snapshot",schema:2,appVersion:APP_VERSION,createdAt:new Date().toISOString(),
    house:{...CONFIG.house},
    view:{mode:"classic",renderMode:state.renderMode,zoomIndex:state.zoomIndex,depthIndex:state.depthIndex,center:{...state.center},scenario:state.scenario,layers:Object.fromEntries(layerKeys.map(k=>[k,!!state[k]]))},
    data:{
      osm:state.osm||[],osmMeta:state.osmMeta||null,osmBaseCoverage:state.osmBaseCoverage||[],osmDetailCoverage:state.osmDetailCoverage||[],
      officialCavities:state.officialCavities||[],cartofriches:state.cartofriches||[],heritageItems:state.heritageItems||[],heritageEnabled:state.heritageEnabled||{},
      cadastreBuildings:state.cadastreBuildings||[],cadastreParcels:state.cadastreParcels||[],address:state.address||null,
      bss:state.bss||[],elevation:state.elevation||null,observations:state.observations||[],loreItems:state.loreItems||[],encounterCollection:state.encounterCollection||{},encounterEnabled:!!state.encounterEnabled
    }
  };
}
function snapshotCounts(s=buildAtlasSnapshot()){
  const d=s.data||{};return {osm:d.osm?.length||0,buildings:d.cadastreBuildings?.length||0,parcels:d.cadastreParcels?.length||0,cavities:d.officialCavities?.length||0,carto:d.cartofriches?.length||0,bss:d.bss?.length||0,observations:d.observations?.length||0,lore:d.loreItems?.length||0,heritage:d.heritageItems?.length||0,codex:Object.values(d.encounterCollection||{}).filter(v=>encounterStatusRank(v?.status)>=2).length,elevation:d.elevation?"oui":"non"};
}
function updateSnapshotUI(source=state.snapshotSource){
  if(!els.snapshotStatus)return;
  const c=snapshotCounts();
  els.snapshotStatus.innerHTML=`<span><strong>État actif :</strong> ${esc(source||"session courante")}</span><span>OSM ${c.osm.toLocaleString("fr-FR")} · bâti ${c.buildings.toLocaleString("fr-FR")} · parcelles ${c.parcels.toLocaleString("fr-FR")}</span><span>Cavités ${c.cavities} · Cartofriches ${c.carto} · patrimoine ${c.heritage} · BSS ${c.bss.toLocaleString("fr-FR")}</span><span>Observations ${c.observations} · mémoire locale ${c.lore} · codex ${c.codex}/${LOCAL_ENCOUNTERS.length} · relief ${c.elevation}</span>`;
}
function openSnapshotDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("IndexedDB indisponible"));return}
    const req=indexedDB.open(SNAPSHOT_DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(SNAPSHOT_DB_STORE))db.createObjectStore(SNAPSHOT_DB_STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Ouverture IndexedDB impossible"));
  });
}
async function saveSnapshotToDb(snapshot){
  const db=await openSnapshotDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite");tx.objectStore(SNAPSHOT_DB_STORE).put(snapshot,SNAPSHOT_DB_KEY);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
}
async function loadSnapshotFromDb(){
  try{const db=await openSnapshotDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(SNAPSHOT_DB_STORE,"readonly");const req=tx.objectStore(SNAPSHOT_DB_STORE).get(SNAPSHOT_DB_KEY);req.onsuccess=()=>{db.close();resolve(req.result||null)};req.onerror=()=>{db.close();reject(req.error)}})}catch{return null}
}
async function deleteSnapshotFromDb(){
  try{const db=await openSnapshotDb();await new Promise((resolve,reject)=>{const tx=db.transaction(SNAPSHOT_DB_STORE,"readwrite");tx.objectStore(SNAPSHOT_DB_STORE).delete(SNAPSHOT_DB_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}catch{}
}
function applyAtlasSnapshot(snapshot,{source="instantané",renderNow=true}={}){
  if(!snapshot||snapshot.format!=="atlas-karst-snapshot"||!snapshot.data)throw new Error("Format d’instantané non reconnu");
  const d=snapshot.data,v=snapshot.view||{};
  if(snapshot.house&&Number.isFinite(+snapshot.house.lat)&&Number.isFinite(+snapshot.house.lon)){
    CONFIG.house={lat:+snapshot.house.lat,lon:+snapshot.house.lon};markSpatialIndexesDirty();
    els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7);
  }
  state.osm=Array.isArray(d.osm)?d.osm:[];markMapDataRevision("osm");state.osmMeta=d.osmMeta||null;
  state.osmBaseCoverage=Array.isArray(d.osmBaseCoverage)?d.osmBaseCoverage:[];state.osmDetailCoverage=Array.isArray(d.osmDetailCoverage)?d.osmDetailCoverage:[];
  state.osmCavities=extractOsmCavities(state.osm);
  state.officialCavities=Array.isArray(d.officialCavities)?d.officialCavities:[];
  state.cartofriches=Array.isArray(d.cartofriches)?d.cartofriches:[];state.heritageItems=Array.isArray(d.heritageItems)?d.heritageItems.map(normalizeHeritageItem).filter(Boolean):[];state.heritageEnabled={...state.heritageEnabled,...(d.heritageEnabled||{})};
  state.cadastreBuildings=Array.isArray(d.cadastreBuildings)?d.cadastreBuildings:[];state.cadastreParcels=Array.isArray(d.cadastreParcels)?d.cadastreParcels:[];
  state.address=d.address||null;state.bss=Array.isArray(d.bss)&&d.bss.length?d.bss:mergeBssItems(BSS_EMBEDDED_LOCAL);state.elevation=d.elevation||null;
  state.observations=Array.isArray(d.observations)?d.observations:[];state.loreItems=Array.isArray(d.loreItems)?d.loreItems:[];state.encounterCollection=d.encounterCollection&&typeof d.encounterCollection==="object"?d.encounterCollection:state.encounterCollection;state.encounterEnabled=d.encounterEnabled!==undefined?!!d.encounterEnabled:state.encounterEnabled;saveEncounterCollection();
  state.zoomIndex=clamp(Number(v.zoomIndex??state.zoomIndex),0,CONFIG.zooms.length-1);state.depthIndex=clamp(Number(v.depthIndex??state.depthIndex),0,CONFIG.depths.length-1);
  state.center=v.center&&Number.isFinite(+v.center.lat)&&Number.isFinite(+v.center.lon)?clampCenter({lat:+v.center.lat,lon:+v.center.lon},CONFIG.zooms[state.zoomIndex]):{...CONFIG.house};
  state.scenario=v.scenario||state.scenario;els.scenario.value=state.scenario;
  state.renderMode=v.renderMode==="ascii"?"ascii":v.renderMode==="symbolic"?"symbolic":state.renderMode;
  if(v.layers)for(const [k,value] of Object.entries(v.layers)){if(k in state){state[k]=!!value;if(els[k])els[k].checked=!!value}}
  state.allowNetwork=FORCE_ONLINE;state.snapshotSource=source;state.selectedCell=null;state.selectionAssistVisible=false;state.guidedTourActive=false;state.guidedTourStep=0;
  refreshCavities();updateBssUI();updateCartofrichesUI();updateHeritageUI();populateCavitySelect();
  setStatus("osm","ok",state.osm.length?`${state.osm.length} objets · instantané`:"instantané sans OSM");
  setStatus("address",state.address?"ok":"bad",state.address?"instantané":"non embarqué");
  setStatus("cadastre",state.cadastreBuildings.length?"ok":"bad",state.cadastreBuildings.length?`${state.cadastreBuildings.length} bât. · instantané`:"non embarqué");
  setStatus("cavities",state.officialCavities.length?"ok":"bad",state.officialCavities.length?`${state.officialCavities.length} · instantané`:"repères locaux seulement");
  setStatus("heritage",state.heritageItems.length?"ok":"pending",state.heritageItems.length?`${state.heritageItems.length} · instantané`:"non embarqué");
  setStatus("elevation",state.elevation?"ok":"bad",state.elevation?"instantané":"non embarqué");
  if(els.offlineNotice)els.offlineNotice.style.display="block";
  els.retryData.textContent="↻ actualiser les sources en ligne";
  els.sourceNote.innerHTML=`Atlas chargé depuis un <strong>${esc(source)}</strong>. Aucune requête réseau automatique n’est effectuée ; le bouton d’actualisation réactive volontairement les services distants.`;
  updateSnapshotUI(source);
  updateEncounterUI();
  if(renderNow)render();
}
function exportSnapshotJson(){
  const snapshot=buildAtlasSnapshot();
  downloadBlob(JSON.stringify(snapshot,null,2),"application/json;charset=utf-8",`atlas-karst-${new Date().toISOString().slice(0,10)}.atlas.json`);
  els.snapshotHelp.textContent="Sauvegarde JSON exportée. Elle peut être chargée dans cette version ou une version ultérieure compatible.";
}
async function importSnapshotFile(file){
  if(!file)return;
  try{
    const snapshot=JSON.parse(await file.text());
    applyAtlasSnapshot(snapshot,{source:`sauvegarde importée · ${file.name}`});
    try{await saveSnapshotToDb(snapshot);els.snapshotHelp.textContent="Sauvegarde chargée et mémorisée dans ce navigateur pour le prochain démarrage."}
    catch(err){els.snapshotHelp.textContent=`Sauvegarde chargée pour cette session, mais le navigateur n’a pas pu la mémoriser (${err?.message||"stockage indisponible"}). Exporte plutôt un HTML autonome.`}
  }catch(err){els.snapshotHelp.textContent=`Import impossible : ${err?.message||"fichier invalide"}`}
  els.snapshotFile.value="";
}
function exportStandaloneHtml(){
  const snapshot=buildAtlasSnapshot();
  const clone=document.documentElement.cloneNode(true);
  const map=clone.querySelector("#map");if(map)map.textContent="";
  const tip=clone.querySelector("#hoverTip");if(tip)tip.textContent="";
  const assist=clone.querySelector("#selectionAssist");if(assist)assist.setAttribute("hidden","");
  const snapTag=clone.querySelector("#atlas-snapshot");
  snapTag.textContent=JSON.stringify(snapshot).replace(/</g,"\\u003c");
  const title=clone.querySelector("title");if(title)title.textContent=`Atlas Karst ASCII ${APP_VERSION} · instantané autonome`;
  const html="<!doctype html>\n"+clone.outerHTML;
  downloadBlob(html,"text/html;charset=utf-8",`atlas-karst-autonome-${new Date().toISOString().slice(0,10)}.html`);
  els.snapshotHelp.textContent="HTML autonome généré. Il contient les données actuellement chargées et démarrera hors ligne par défaut.";
}

function exportTxt(){
  if(!state.lastGrid)return;
  const lines=[];
  for(let y=0;y<CONFIG.gridH;y++)lines.push(state.lastGrid.grid[y].map(c=>c.ch).join(""));
  const z=currentZoom(),d=currentDepth();
  const header=[
    `ATLAS KARST ASCII v${APP_VERSION} · moteur Canvas et index spatial`,
    `Échelle : ${z.label} (${z.widthKm} × ${z.heightKm} km)`,
    `Centre : ${state.center.lat}, ${state.center.lon}`,
    `Coupe : ${depthSliceLabel(d)}${d===0?"":` (${depthSliceMeta(d).range})`}`,
    `Scénario : ${state.scenario}`,
    "ATTENTION : coupes souterraines extrapolées. Les profondeurs précédées de ≈ ne sont pas des mesures locales sauf mention explicite.",
    ""
  ].join("\n");
  const blob=new Blob([header+lines.join("\n")],{type:"text/plain;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`atlas-karst-${z.id}-${d}m.txt`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

let suppressClickUntil=0;
activeMapSurface().addEventListener("click",ev=>{
  if(Date.now()<suppressClickUntil)return;
  if(state.placingHouse){
    const pos=eventMapPosition(ev);if(pos)saveHousePosition(pos.coord,"placement manuel sur la grille");
    return;
  }
  const pos=eventMapPosition(ev);if(!pos||!state.lastGrid)return;
  if(effectiveRenderMode()==="symbolic"){
    const hit=symbolicPoiHitFromClient(ev.clientX,ev.clientY,1.18);if(hit&&selectSymbolicPoi(hit.poi))return;
  }
  const symbolicAssist=effectiveRenderMode()==="symbolic";
  const radius=[1,1,1,2,2,3][state.zoomIndex]||1;
  selectGridCell(pos.x,pos.y,{assist:symbolicAssist,assistRadius:radius,note:"Sélection directe",showAssist:false});
});
activeMapSurface().addEventListener("dblclick",ev=>{
  ev.preventDefault();
  if(state.placingHouse)return;
  const pos=eventMapPosition(ev);if(!pos)return;
  state.center=clampCenter(pos.coord,currentZoom());
  if(state.zoomIndex<CONFIG.zooms.length-1){beginZoomTransition("in",{clientX:ev.clientX,clientY:ev.clientY});retroAudio.play("zoomIn");state.zoomIndex++}
  state.center=clampCenter(state.center,currentZoom());
  render();
});
let lastWheelZoomAt=0;
els.viewport.addEventListener("wheel",ev=>{
  if(Math.abs(ev.deltaY)<2)return;
  ev.preventDefault();
  const now=performance.now();
  if(now-lastWheelZoomAt<120)return;
  lastWheelZoomAt=now;
  const pos=eventMapPosition(ev);if(!pos)return;
  const dir=ev.deltaY<0?1:-1;
  setZoomIndex(state.zoomIndex+dir,pos.coord,{fx:pos.fx,fy:pos.fy,clientX:ev.clientX,clientY:ev.clientY});
},{passive:false});
let drag=null;
const touchPointers=new Map();
let pinch=null,pinchConsumed=false,lastPinchZoomAt=0;
function applyPanPreview(dx,dy){
  const surface=activeMapSurface();if(!surface)return;
  const safeX=clamp(Number(dx)||0,-window.innerWidth*1.5,window.innerWidth*1.5);
  const safeY=clamp(Number(dy)||0,-window.innerHeight*1.5,window.innerHeight*1.5);
  const transform=`translate3d(${safeX.toFixed(2)}px,${safeY.toFixed(2)}px,0)`;
  surface.style.transform=transform;
  if(CANVAS_RENDERER&&els.renderFxLayer)els.renderFxLayer.style.transform=transform;
}
function clearPanPreview(){
  const surface=activeMapSurface();if(surface)surface.style.transform="";
  if(els.renderFxLayer)els.renderFxLayer.style.transform="translateZ(0)";
}
function panGeographicPixelSpan(){
  if(CANVAS_RENDERER){
    const m=canvasRuntime.metrics||syncCanvasSize(),r=els.mapCanvas?.getBoundingClientRect();
    if(!m||!r)return {width:1,height:1};
    const scaleX=m.width?Math.abs(r.width/m.width):1,scaleY=m.height?Math.abs(r.height/m.height):1;
    return {
      width:Math.max(1,(CONFIG.gridW-1)*m.cellW*scaleX),
      height:Math.max(1,(CONFIG.gridH-1)*m.cellH*scaleY)
    };
  }
  const m=mapGridMetrics();
  return m?{width:Math.max(1,(CONFIG.gridW-1)*m.pitchX),height:Math.max(1,(CONFIG.gridH-1)*m.pitchY)}:{width:1,height:1};
}
function isPanPointer(ev){
  return ev.isPrimary!==false && (ev.pointerType!=="mouse" || ev.button===0);
}
function pointerDistance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function beginPinch(){
  if(touchPointers.size<2||state.placingHouse)return false;
  const pair=[...touchPointers.entries()].slice(0,2),a=pair[0][1],b=pair[1][1];
  const distance=pointerDistance(a,b);if(distance<14)return false;
  if(drag){drag=null;clearPanPreview();activeMapSurface()?.classList.remove("dragging")}
  pinch={ids:[pair[0][0],pair[1][0]],distance};
  pinchConsumed=true;suppressClickUntil=Date.now()+900;
  activeMapSurface()?.classList.add("pinching");els.viewport.classList.add("panning");
  return true;
}
function handlePinchMove(ev){
  if(!pinch)return false;
  const a=touchPointers.get(pinch.ids[0]),b=touchPointers.get(pinch.ids[1]);
  if(!a||!b)return false;
  const distance=pointerDistance(a,b);if(!Number.isFinite(distance)||distance<8)return true;
  const ratio=distance/pinch.distance,now=performance.now();
  if(now-lastPinchZoomAt<130)return true;
  const dir=ratio>=1.20?1:ratio<=.84?-1:0;if(!dir)return true;
  const minZoom=0,next=clamp(state.zoomIndex+dir,minZoom,CONFIG.zooms.length-1);
  pinch.distance=distance;lastPinchZoomAt=now;
  if(next===state.zoomIndex)return true;
  const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,pos=mapPositionFromClient(midX,midY);
  if(pos)setZoomIndex(next,pos.coord,{fx:pos.fx,fy:pos.fy,clientX:midX,clientY:midY});
  return true;
}
activeMapSurface().addEventListener("pointerdown",ev=>{
  if(ev.pointerType==="touch"){
    touchPointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    try{activeMapSurface()?.setPointerCapture?.(ev.pointerId)}catch{}
    if(touchPointers.size>=2&&beginPinch()){ev.preventDefault();return}
    if(state.placingHouse)return;
  }
  if(!isPanPointer(ev)||state.placingHouse||drag||pinch)return;
  const rect=els.viewport.getBoundingClientRect(),panSpan=panGeographicPixelSpan();
  drag={
    pointerId:ev.pointerId,
    pointerType:ev.pointerType||"mouse",
    x:ev.clientX,y:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,
    center:{...state.center},
    extent:extentFor(),
    rect:{width:rect.width,height:rect.height},
    panSpan,
    moved:false,dx:0,dy:0
  };
  try{activeMapSurface()?.setPointerCapture?.(ev.pointerId)}catch{}
  activeMapSurface()?.classList.add("dragging");
  els.viewport.classList.add("panning");
  if(ev.pointerType!=="mouse")ev.preventDefault();
});
activeMapSurface().addEventListener("pointerover",ev=>{
  if(CANVAS_RENDERER||ev.pointerType!=="mouse"||drag||pinch||state.placingHouse)return;
  const target=ev.target?.closest?.(".cell");
  if(target&&els.map.contains(target))scheduleHover(target,ev);
});
activeMapSurface().addEventListener("pointerout",ev=>{
  if(CANVAS_RENDERER||ev.pointerType!=="mouse")return;
  const from=ev.target?.closest?.(".cell"),to=ev.relatedTarget?.closest?.(".cell");
  if(from&&from!==to)hideHover();
});
activeMapSurface().addEventListener("pointermove",ev=>{
  if(ev.pointerType==="touch"&&touchPointers.has(ev.pointerId)){
    touchPointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(handlePinchMove(ev)){ev.preventDefault();return}
  }
  if(CANVAS_RENDERER&&ev.pointerType==="mouse"&&!drag&&!pinch&&!state.placingHouse){const pos=mapPositionFromClient(ev.clientX,ev.clientY);if(pos)scheduleCanvasHover(pos,ev)}
  if(!drag)return;
  if(ev.pointerId!==drag.pointerId)return;
  drag.lastX=ev.clientX;drag.lastY=ev.clientY;
  const dx=drag.lastX-drag.x,dy=drag.lastY-drag.y;
  const threshold=drag.pointerType==="touch"?8:4;
  if(!drag.moved&&Math.hypot(dx,dy)<=threshold)return;
  if(!drag.moved)retroAudio.panStart();
  drag.moved=true;drag.dx=dx;drag.dy=dy;
  retroAudio.panMove(dx,dy);
  if(state.selectionAssistVisible)closeSelectionAssist();
  hideHover();
  ev.preventDefault();
  applyPanPreview(dx,dy);
});
activeMapSurface().addEventListener("pointerleave",ev=>{if(!drag&&ev.pointerType==="mouse")hideHover()});
function endDrag(ev){
  if(!drag||ev.pointerId!==drag.pointerId)return;
  const current=drag;
  const moved=current.moved;
  drag=null;
  if(moved){
    retroAudio.panEnd();
    suppressClickUntil=Date.now()+700;
    ev.preventDefault();
  }else if(current.pointerType!=="mouse"&&!state.placingHouse){
    const pos=eventMapPosition(ev);
    if(pos){suppressClickUntil=Date.now()+700;selectGridCell(pos.x,pos.y,{assist:true,assistRadius:state.zoomIndex===CONFIG.zooms.length-1?2:null,note:"Sélection tactile",showAssist:true,confirmIfSame:true});ev.preventDefault()}
  }
  try{activeMapSurface()?.releasePointerCapture?.(current.pointerId)}catch{}

  if(moved&&current.panSpan?.width>0&&current.panSpan?.height>0){
    // Le relâchement peut arriver quelques pixels après le dernier pointermove.
    // On utilise donc la dernière position réelle connue, puis le pas exact entre
    // le centre de la première et de la dernière cellule. Les marges du Canvas ne
    // participent plus à la conversion géographique, ce qui supprime la dérive.
    const finalX=Number.isFinite(current.lastX)?current.lastX:current.x+current.dx;
    const finalY=Number.isFinite(current.lastY)?current.lastY:current.y+current.dy;
    const dx=finalX-current.x,dy=finalY-current.y;
    const latSpan=current.extent.north-current.extent.south;
    const lonSpan=current.extent.east-current.extent.west;
    const candidate={
      lat:current.center.lat+(dy/current.panSpan.height)*latSpan,
      lon:current.center.lon-(dx/current.panSpan.width)*lonSpan
    };
    if(Number.isFinite(candidate.lat)&&Number.isFinite(candidate.lon)){
      state.center=clampCenter(candidate,currentZoom());
      render("pan-release");
    }
  }

  clearPanPreview();
  activeMapSurface()?.classList.remove("dragging");
  els.viewport.classList.remove("panning");
  if(CANVAS_RENDERER){syncSelectionDom();updateWorldBoundaryFrame()}
}
function finishMapPointer(ev){
  const wasTouch=ev.pointerType==="touch";
  if(wasTouch)touchPointers.delete(ev.pointerId);
  if(pinch||pinchConsumed){
    suppressClickUntil=Date.now()+900;
    if(ev.cancelable)ev.preventDefault();
    if(pinch&&(!touchPointers.has(pinch.ids[0])||!touchPointers.has(pinch.ids[1]))){
      pinch=null;activeMapSurface()?.classList.remove("pinching");
      if(!drag)els.viewport.classList.remove("panning");
    }
    try{activeMapSurface()?.releasePointerCapture?.(ev.pointerId)}catch{}
    if(touchPointers.size===0)pinchConsumed=false;
    return;
  }
  endDrag(ev);
}
activeMapSurface().addEventListener("pointerup",finishMapPointer);
activeMapSurface().addEventListener("pointercancel",finishMapPointer);
activeMapSurface().addEventListener("lostpointercapture",ev=>{
  if(ev.pointerType==="touch"&&touchPointers.has(ev.pointerId))touchPointers.delete(ev.pointerId);
  if(pinchConsumed)return;
  if(drag&&ev.pointerId===drag.pointerId)endDrag(ev);
});
els.viewport.addEventListener("scroll",()=>{if(CANVAS_RENDERER){syncRenderFxGeometry(canvasRuntime.metrics);syncSelectionDom();if(hoverCandidate){if(hoverCandidate.poiUid){const poi=normalizedPoiByUid(hoverCandidate.poiUid);if(poi&&state.lastGrid){const p=coordToGrid(poi.lat,poi.lon,state.lastGrid.extent);positionCanvasMarker(els.canvasHoverMarker,p.x,p.y,true)}}else{const [x,y]=hoverCandidate.key.split(":").map(Number);positionCanvasMarker(els.canvasHoverMarker,x,y,true)}}updateWorldBoundaryFrame()}},{passive:true});
els.selectionUp.addEventListener("click",()=>moveSelection(0,-1));
els.selectionDown.addEventListener("click",()=>moveSelection(0,1));
els.selectionLeft.addEventListener("click",()=>moveSelection(-1,0));
els.selectionRight.addEventListener("click",()=>moveSelection(1,0));
els.selectionCenter.addEventListener("click",()=>{if(state.selectedCell){state.center=clampCenter({...state.selectedCell.coord},currentZoom());render();closeSelectionAssist()}});
els.selectionAssistClose.addEventListener("click",closeSelectionAssist);
els.exportSnapshotJson.addEventListener("click",exportSnapshotJson);
els.importSnapshotJson.addEventListener("click",()=>els.snapshotFile.click());
els.snapshotFile.addEventListener("change",e=>importSnapshotFile(e.target.files?.[0]));
els.exportStandaloneHtml.addEventListener("click",exportStandaloneHtml);
els.clearSavedSnapshot.addEventListener("click",async()=>{await deleteSnapshotFromDb();els.snapshotHelp.textContent="La sauvegarde locale a été oubliée. Les données restent visibles jusqu’à la fermeture de cette session.";state.snapshotSource="session courante";updateSnapshotUI()});

els.syncOsm.addEventListener("click",syncOsmNow);
els.testOsm.addEventListener("click",testOsmServers);
els.openOsmQuery.addEventListener("click",openCurrentOverpassQuery);
els.importOsmJson.addEventListener("click",()=>els.osmFile.click());
els.osmFile.addEventListener("change",e=>importOsmJsonFile(e.target.files?.[0]));

els.syncPiezo.addEventListener("click",syncHubeauPiezo);
els.openBssDownload.addEventListener("click",()=>window.open(BSS_DOWNLOAD_URL,"_blank","noopener"));
els.importBss.addEventListener("click",()=>els.bssFile.click());
els.bssFile.addEventListener("change",e=>importBssFile(e.target.files?.[0]));
els.clearBss.addEventListener("click",()=>{
  try{localStorage.removeItem(BSS_LOCAL_KEY);localStorage.removeItem("atlas-karst-bss-v09b")}catch{}
  state.bss=mergeBssItems(BSS_EMBEDDED_LOCAL);
  updateBssUI("Couche réinitialisée sur les 736 ouvrages BRGM embarqués.");
  els.layerBss.checked=true;state.layerBss=true;
  render();
});
els.syncCartofriches.addEventListener("click",syncCartofriches);
els.downloadCartofriches.addEventListener("click",()=>window.open(CARTOFRICHES_DOWNLOAD,"_blank","noopener"));
els.importCartofriches.addEventListener("click",()=>els.cartofrichesFile.click());
els.cartofrichesFile.addEventListener("change",e=>importCartofrichesFile(e.target.files?.[0]));
els.clearCartofriches.addEventListener("click",()=>{
  state.cartofriches=[];
  try{localStorage.removeItem(CARTOFRICHES_KEY)}catch{}
  updateCartofrichesUI("Couche locale vidée.");
  render();
});
els.cartofrichesReconverted.addEventListener("change",e=>{
  state.cartofrichesIncludeReconverted=e.target.checked;
  saveCartofriches();updateCartofrichesUI();render();
});
els.sidebarToggle.addEventListener("click",toggleSidebar);
els.sidebarClose.addEventListener("click",()=>setSidebarOpen(false));
els.sidebarBackdrop.addEventListener("click",()=>setSidebarOpen(false));
els.collapseCards.addEventListener("click",()=>setAllSidebarCards(true));
els.expandCards.addEventListener("click",()=>setAllSidebarCards(false));
els.infoToggle.addEventListener("click",()=>setInfoVisible(document.body.classList.contains("info-collapsed")));
els.readoutSheetHandle.addEventListener("click",cycleReadoutSheet);
els.mapDepthUp.addEventListener("click",()=>setDepthIndex(state.depthIndex-1));
els.mapZoomOut.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex-1));
els.mapZoomIn.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex+1));
els.mapDepthDown.addEventListener("click",()=>setDepthIndex(state.depthIndex+1));
function recenterOnHouse(reason="home"){
  clearActiveRelation();
  state.center=clampCenter({...CONFIG.house},currentZoom());
  state.selectedCavity=null;state.selectedCell=null;
  render(reason);
}
els.mapHome.addEventListener("click",()=>recenterOnHouse("map-home"));
els.mapLocate.addEventListener("click",locateUser);
els.locateMe.addEventListener("click",locateUser);
els.clearLocation.addEventListener("click",clearUserLocation);
els.centerOnLocation.addEventListener("change",e=>{state.centerOnLocation=e.target.checked;if(e.target.checked&&state.userLocation&&inExtent(state.userLocation.lat,state.userLocation.lon,largestExtent())){state.center=clampCenter({lat:state.userLocation.lat,lon:state.userLocation.lon},currentZoom());render()}});
els.zoomOut.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex-1));
els.zoomIn.addEventListener("click",()=>setZoomFromViewport(state.zoomIndex+1));
els.depthUp.addEventListener("click",()=>setDepthIndex(state.depthIndex-1));
els.depthDown.addEventListener("click",()=>setDepthIndex(state.depthIndex+1));
document.querySelectorAll("[data-pan-x]").forEach(b=>b.addEventListener("click",()=>moveCenter(+b.dataset.panX,+b.dataset.panY)));
els.homeBtn.addEventListener("click",()=>recenterOnHouse("panel-home"));
els.placeHouse.addEventListener("click",()=>{
  if(!state.selectedCell){els.houseHelp.innerHTML='<span class="house-placement-note">Clique d’abord une case : elle sera entourée en jaune.</span>';return}
  saveHousePosition(state.selectedCell.coord,"case sélectionnée");state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.resetHouse.addEventListener("click",()=>{
  saveHousePosition({...HOUSE_ESTIMATE},"coordonnées précises fournies par l’utilisateur");
  recenterOnHouse("reset-home");
});
els.geocodeHouse.addEventListener("click",async()=>{
  const a=await fetchAddress(true);if(!a)return;
  if(state.cadastreBuildings.length){
    CONFIG.house={lat:a.lat,lon:a.lon};markSpatialIndexesDirty();
    state.address=a;
    snapHouseToBuilding(true);
  }else{
    saveHousePosition({lat:a.lat,lon:a.lon},`adresse officielle : ${a.label}`,true);
  }
  state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.snapHouseBuilding.addEventListener("click",()=>{if(snapHouseToBuilding(true)){state.center=clampCenter({...CONFIG.house},currentZoom());render()}});
els.openHistory.addEventListener("click",()=>{window.open(`https://remonterletemps.ign.fr/comparer/?lat=${CONFIG.house.lat}&lon=${CONFIG.house.lon}&z=16&mode=split-h`,"_blank","noopener")});
els.applyHouseCoords.addEventListener("click",()=>{
  const lat=Number(els.houseLat.value),lon=Number(els.houseLon.value);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)){els.houseHelp.innerHTML='<span class="house-placement-note">Coordonnées invalides.</span>';return}
  const e=largestExtent();
  if(!inExtent(lat,lon,e)){els.houseHelp.innerHTML='<span class="house-placement-note">Ces coordonnées sont hors de l’emprise chargée.</span>';return}
  saveHousePosition({lat,lon},"saisie numérique");state.center=clampCenter({...CONFIG.house},currentZoom());render();
});
els.addLocalMarker.addEventListener("click",()=>{
  if(!state.selectedCell){els.localHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
  const mode=els.observationMode.value,glyph=els.localType.value,def=localMarkerDefinition(glyph),name=els.localName.value.trim()||def.detail;
  const target=state.selectedCell.coord,confidence=els.observationConfidence.value,season=els.observationSeason.value.trim();
  const o={id:`OBS-${Date.now()}`,mode,glyph,name,lat:target.lat,lon:target.lon,confidence,season,radius:clamp(Number(els.observationRadius.value)||80,10,1000),source:"Observation locale enregistrée dans cet atlas"};
  if(mode==="sight"){o.origin={...CONFIG.house};o.distance=distanceMeters(CONFIG.house,target);o.bearing=bearingDegrees(CONFIG.house,target)}
  state.observations.push(o);markSpatialIndexesDirty();saveLocalCavities();refreshCavities();render();
  els.localHelp.innerHTML=mode==="sight"?`Visée <strong>${o.bearing.toFixed(0)}°</strong> sur environ <strong>${Math.round(o.distance)} m</strong> enregistrée.`:`Observation <strong>${esc(name)}</strong> enregistrée avec une confiance ${confidenceLabel(confidence)}.`;
  els.localName.value="";
});
els.removeLocalMarker.addEventListener("click",()=>{
  if(!state.selectedCell){els.localHelp.textContent="Sélectionne d’abord l’observation à supprimer.";return}
  const f=state.selectedCell.feature;let id=f?.observation?f.record?.id:f?.record?.observation?.id||null;
  if(!id){
    const nearby=state.observations.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<120)id=nearby.o.id;
  }
  if(!id){els.localHelp.textContent="Aucune observation locale suffisamment proche de la sélection.";return}
  state.observations=state.observations.filter(o=>o.id!==id);saveLocalCavities();refreshCavities();render();els.localHelp.textContent="Observation locale supprimée.";
});

els.addLoreItem.addEventListener("click",()=>{
  if(!state.selectedCell){els.loreHelp.innerHTML='<span class="house-placement-note">Sélectionne d’abord une case sur la carte.</span>';return}
  const category=els.loreCategory.value,def=loreMarkerDefinition(category),target=state.selectedCell.coord;
  const item={
    id:`LOR-${Date.now()}`,
    category,
    name:els.loreName.value.trim()||def.label,
    period:els.lorePeriod.value.trim(),
    source:els.loreSource.value.trim()||"Repère local enregistré dans cet atlas",
    note:els.loreNote.value.trim(),
    lat:target.lat,
    lon:target.lon
  };
  state.loreItems.push(item);markSpatialIndexesDirty();saveLoreItems();render();
  els.loreHelp.innerHTML=`Repère <strong>${esc(item.name)}</strong> enregistré en catégorie <strong>${def.glyph}</strong>.`;
  els.loreName.value=""; els.lorePeriod.value=""; els.loreSource.value=""; els.loreNote.value="";
});
els.removeLoreItem.addEventListener("click",()=>{
  if(!state.selectedCell){els.loreHelp.textContent="Sélectionne d’abord un repère à supprimer.";return}
  const f=state.selectedCell.feature;let id=f?.lore?f.record?.id:null;
  if(!id){
    const nearby=state.loreItems.map(o=>({o,d:distanceMeters(o,state.selectedCell.coord)})).sort((a,b)=>a.d-b.d)[0];
    if(nearby&&nearby.d<120)id=nearby.o.id;
  }
  if(!id){els.loreHelp.textContent="Aucun repère patrimoine / mystère suffisamment proche de la sélection.";return}
  state.loreItems=state.loreItems.filter(o=>o.id!==id);saveLoreItems();render();els.loreHelp.textContent="Repère patrimoine / mystère supprimé.";
});



els.aroundRadius.addEventListener("change",e=>{state.aroundRadius=Number(e.target.value)||500;updateAroundMe();retroAudio.play("toggle")});
els.refreshAround.addEventListener("click",locateUser);
document.addEventListener("click",e=>{
  const focus=e.target.closest?.("[data-poi-focus]");
  if(focus){e.preventDefault();focusNormalizedPoi(focus.dataset.poiFocus);return}
  const relation=e.target.closest?.("[data-relation-from][data-relation-to]");
  if(relation){e.preventDefault();framePoiRelation(relation.dataset.relationFrom,relation.dataset.relationTo,relation.dataset.relationLabel||"relation")}
});


els.encounterEnabled.addEventListener("change",e=>{state.encounterEnabled=e.target.checked;saveEncounterCollection();updateEncounterUI();retroAudio.play("toggle")});
els.observeSurroundings.addEventListener("click",()=>startLocalEncounter());
els.testEncounter.addEventListener("click",()=>startLocalEncounter({testMode:true}));
els.openCodex.addEventListener("click",()=>openCodex());
els.encounterClose.addEventListener("click",closeEncounterOverlay);
els.encounterBody.addEventListener("click",handleEncounterClick);
els.encounterOverlay.addEventListener("click",e=>{if(e.target===els.encounterOverlay)closeEncounterOverlay()});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&els.encounterOverlay.classList.contains("active")){e.preventDefault();closeEncounterOverlay()}});

els.guidedTourSelect.addEventListener("change",e=>{
  state.guidedTourId=e.target.value;state.guidedTourStep=0;
  if(state.guidedTourActive)focusGuidedTourStep(0);else updateGuidedTourUI();
  retroAudio.play("toggle");
});
els.guidedTourStart.addEventListener("click",startGuidedTour);
els.guidedTourPrev.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep-1));
els.guidedTourNext.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep+1));
els.guidedTourRecenter.addEventListener("click",()=>focusGuidedTourStep(state.guidedTourStep,{announce:false}));
els.guidedTourStop.addEventListener("click",stopGuidedTour);

const heritageToggleBindings={heritageMonuments:"monument",heritageGardens:"garden",heritageHomes:"house",heritageMuseums:"museum",heritageWikipedia:"wikipedia"};
for(const [id,key] of Object.entries(heritageToggleBindings))els[id].addEventListener("change",e=>{state.heritageEnabled[key]=e.target.checked;saveHeritage();updateHeritageUI();render()});
els.syncCultureHeritage.addEventListener("click",syncCultureHeritage);
els.syncWikipediaHeritage.addEventListener("click",syncWikipediaHeritage);
els.clearHeritage.addEventListener("click",clearHeritage);

els.recenterSelected.addEventListener("click",()=>{
  if(!state.selectedCell){setReadoutContent("<strong>Aucune case mémorisée.</strong><br>Clique d’abord un point de la carte.",{title:"Aucune sélection",sheet:"peek"});return}
  state.center=clampCenter(state.selectedCell.coord,currentZoom());render();
});
els.exportBtn.addEventListener("click",exportTxt);
els.retryData.addEventListener("click",async()=>{
  state.allowNetwork=true;
  if(els.offlineNotice)els.offlineNotice.style.display="none";
  els.retryData.textContent="↻ recharger toutes les données";
  try{
    ["atlas-karst-address-v06","atlas-karst-cadastre-v06","atlas-karst-cavities-v06","atlas-karst-elevation-v06","atlas-karst-elevation-v09d"]
      .forEach(k=>localStorage.removeItem(k));
  }catch{}
  await syncOsmNow();
  Promise.allSettled([fetchAddress(true),fetchCadastre(),fetchCavities(),fetchElevation()]);
});
els.scenario.addEventListener("change",e=>{state.scenario=e.target.value;hypothesisModelCache.clear();render()});
els.renderModeSymbolic?.addEventListener("click",()=>setRenderMode("symbolic"));
els.renderModeAscii?.addEventListener("click",()=>setRenderMode("ascii"));
["layerSurface","layerRelief","layerCadastreBuildings","layerParcels","layerBss","layerObservations","layerHeritage","layerLore","layerCartofriches","layerCavities","layerHypothesis","layerHydrology","layerLabels","layerHouse","ambientMotion"].forEach(id=>{
  els[id].addEventListener("change",e=>{
    state[id]=e.target.checked;
    if(id==="layerHydrology")hypothesisModelCache.clear();
    if(id==="ambientMotion"){
      try{localStorage.setItem(AMBIENT_PREF_KEY,state.ambientMotion?"on":"off")}catch{}
      syncAmbientMotionState({pulse:state.ambientMotion,reason:"preference"});
    }
    render();
  });
});
els.cavitySelect.addEventListener("change",e=>{
  const c=state.cavities.find(v=>v.id===e.target.value);
  if(!c||!Number.isFinite(c.lat))return;
  state.zoomIndex=2;state.center=clampCenter({lat:c.lat,lon:c.lon},currentZoom());state.selectedCavity=c.id;render();
  setReadoutContent(`<strong>${esc(cavityName(c))}</strong><br>${esc(cavityMarker(c).label)} · ${esc(c.id)}${c.commune?` · ${esc(c.commune)}`:""}<br>La carte est recentrée sur le point inventorié. Descends à −8 m ou −14 m pour voir les scénarios, sans confondre leur dessin avec une topographie réelle.`,{title:cavityName(c),sheet:"full"});
});
window.addEventListener("resize",()=>{
  if(!mobileSidebarMode())document.body.classList.remove("sidebar-open");
  scheduleFrameFit();
});
if(typeof ResizeObserver!=="undefined"){
  const responsiveMapObserver=new ResizeObserver(()=>scheduleFrameFit());
  responsiveMapObserver.observe(document.querySelector("main"));
}
if(els.debugToggle)els.debugToggle.addEventListener("click",()=>setDebugEnabled(!debugState.enabled));
if(els.runSelfCheck)els.runSelfCheck.addEventListener("click",runAtlasSelfCheck);
if(els.exportDebugReport)els.exportDebugReport.addEventListener("click",exportDebugReport);
window.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="d"){
    e.preventDefault();setDebugEnabled(!debugState.enabled);
  }
});
window.addEventListener("keydown",e=>{
  const tag=e.target?.tagName?.toLowerCase();
  if(["input","select","textarea","button","a"].includes(tag)||e.target?.isContentEditable)return;
  const k=e.key.toLowerCase();
  const controlled=["arrowleft","arrowright","arrowup","arrowdown","q","d","z","s","+","-","[","]","h"];
  if(controlled.includes(k)||e.key==="=")e.preventDefault();
  if(k==="arrowleft"||k==="q")moveCenter(-1,0);
  else if(k==="arrowright"||k==="d")moveCenter(1,0);
  else if(k==="arrowup"||k==="z")moveCenter(0,1);
  else if(k==="arrowdown"||k==="s")moveCenter(0,-1);
  else if(e.key==="+"||e.key==="=")setZoomFromViewport(state.zoomIndex+1);
  else if(e.key==="-")setZoomFromViewport(state.zoomIndex-1);
  else if(e.key==="[")setDepthIndex(state.depthIndex-1);
  else if(e.key==="]")setDepthIndex(state.depthIndex+1);
  else if(k==="h"){state.layerHypothesis=!state.layerHypothesis;els.layerHypothesis.checked=state.layerHypothesis;render()}
});

// Les navigateurs mobiles n’autorisent Web Audio qu’après un geste explicite.
// On arme donc le moteur dès le premier contact, avant les gestionnaires métier.
document.addEventListener("pointerdown",()=>retroAudio.unlock(),{capture:true,passive:true});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){retroAudio.silence();setRenderFxActivity(false,"hidden")}
  else pulseRenderFxActivity(650,"visible");
});
window.addEventListener("blur",()=>setRenderFxActivity(false,"blur"));
window.addEventListener("focus",()=>pulseRenderFxActivity(650,"focus"));
reducedMotionQuery?.addEventListener?.("change",()=>syncAmbientMotionState({pulse:false,reason:"system-preference"}));
document.addEventListener("touchstart",()=>retroAudio.unlock(),{capture:true,passive:true});
document.addEventListener("keydown",()=>retroAudio.unlock(),{capture:true});
document.addEventListener("toggle",ev=>{
  if(ev.target instanceof HTMLDetailsElement)retroAudio.play(ev.target.open?"panelOpen":"panelClose");
},true);

const syncSoundTargets={
  syncOsm:()=>[els.osmStatus],
  syncCultureHeritage:()=>[els.heritageStatus],
  syncWikipediaHeritage:()=>[els.heritageStatus],
  syncCartofriches:()=>[els.cartofrichesStatus],
  syncPiezo:()=>[els.bssStatus],
  retryData:()=>[els.osmStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
};
const quietButtonIds=new Set([
  "audioToggle","mapZoomOut","mapZoomIn","zoomOut","zoomIn","mapDepthUp","mapDepthDown","depthUp","depthDown",
  "selectionUp","selectionDown","selectionLeft","selectionRight","locateMe","mapLocate","debugToggle","runSelfCheck","exportDebugReport","guidedTourStart","guidedTourPrev","guidedTourNext","guidedTourRecenter","guidedTourStop","observeSurroundings","openCodex","encounterClose"
]);
document.addEventListener("click",ev=>{
  const button=ev.target.closest?.("button");
  if(!button||button.disabled||quietButtonIds.has(button.id)||button.dataset.audioQuiet!==undefined||button.dataset.zoom!==undefined||button.dataset.depth!==undefined||button.dataset.panX!==undefined)return;
  const syncTargets=syncSoundTargets[button.id]?.()||null;
  if(syncTargets){retroAudio.play("sync");syncTargets.forEach(status=>armOperationSound(status));return}
  if(["mapHome","homeBtn","recenterSelected","selectionCenter"].includes(button.id)){retroAudio.play("home");return}
  if(/export|download|openHistory|openBssDownload|openOsmQuery/i.test(button.id)){retroAudio.play("export");return}
  if(/clear|remove|reset/i.test(button.id)){retroAudio.play("delete");return}
  if(["sidebarToggle","sidebarClose","collapseCards","expandCards","infoToggle","selectionAssistClose"].includes(button.id)){retroAudio.play("panel");return}
  retroAudio.play("button");
},true);
document.addEventListener("change",ev=>{
  const control=ev.target;
  if(control?.matches?.('input[type="checkbox"],select'))retroAudio.play("toggle");
});
els.audioToggle.addEventListener("click",()=>retroAudio.toggle());
[els.osmStatus,els.heritageStatus,els.cartofrichesStatus,els.bssStatus,els.addressStatus,els.cadastreStatus,els.cavityStatus,els.elevationStatus]
  .filter(Boolean).forEach(status=>operationStatusObserver.observe(status,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]}));

async function bootAtlas(){
  retroAudio.init();
  setDebugEnabled(DEBUG_REQUESTED);
  try{state.ambientMotion=localStorage.getItem(AMBIENT_PREF_KEY)!=="off"}catch{}
  try{const savedMode=localStorage.getItem(RENDER_MODE_PREF_KEY);if(savedMode==="ascii"||savedMode==="symbolic")state.renderMode=savedMode}catch{}
  if(els.ambientMotion)els.ambientMotion.checked=state.ambientMotion;
  if(els.aroundRadius)els.aroundRadius.value=String(state.aroundRadius);
prepareSidebarCards();
  buildSidebarClusters();
  if(mobileSidebarMode()){
    setSidebarOpen(false);
    setInfoVisible(false);
  }else{
    setSidebarOpen(true);
    setInfoVisible(true);
    setReadoutSheetState("peek");
  }
  loadLocalCavities();
  loadLoreItems();
  loadHeritage();
  loadCartofriches();
  loadBssLocal();
  loadEncounterCollection();
  els.layerBss.checked=true;state.layerBss=true;
  updateLocationUI();
  updateEncounterUI();
  populateControls();
  refreshCavities();
  els.houseLat.value=CONFIG.house.lat.toFixed(7);els.houseLon.value=CONFIG.house.lon.toFixed(7);
  els.houseHelp.innerHTML=`Repère actuel : <strong>${CONFIG.house.lat.toFixed(7)}, ${CONFIG.house.lon.toFixed(7)}</strong>. Cette version peut exporter cet état en sauvegarde réimportable ou en HTML autonome.`;
  if(els.osmHelp){
    els.osmHelp.innerHTML=LOCAL_FILE_MODE
      ? "Cette copie est ouverte en <code>file://</code>. Les requêtes sont valides, mais les serveurs Overpass peuvent refuser l’origine locale faute de Referer. Utilise <strong>tester les serveurs</strong> pour obtenir un diagnostic précis."
      : "Cette copie est ouverte depuis une origine web. OSM peut utiliser le Referer du site et synchroniser directement les fenêtres visibles.";
  }

  const savedSnapshot=EMBEDDED_SNAPSHOT||await loadSnapshotFromDb();
  if(savedSnapshot){
    try{applyAtlasSnapshot(savedSnapshot,{source:EMBEDDED_SNAPSHOT?"instantané embarqué":"sauvegarde locale",renderNow:false})}
    catch(err){console.warn("Instantané ignoré",err);state.allowNetwork=true}
  }
  render("boot");
  scheduleFrameFit();
  updateSnapshotUI();
  if(debugState.enabled)setTimeout(runAtlasSelfCheck,180);

  if(savedSnapshot){
    populateCavitySelect();
    render();
    return;
  }
  if(OFFLINE_TEST){
    state.zoomIndex=3;
    state.center={...CONFIG.house};
    state.layerBss=false;
    els.layerBss.checked=false;
    els.offlineNotice.style.display="block";
    els.retryData.textContent="↻ tenter les services en ligne";
    setStatus("osm","ok","instantané embarqué minimal");
    setStatus("address","ok","coordonnées locales");
    setStatus("cadastre","bad","non embarqué");
    setStatus("cavities","bad","repères locaux seulement");
    updateCartofrichesUI();
    updateHeritageUI();
    updateBssUI();
    setStatus("elevation","bad","non embarqué");
    els.sourceNote.innerHTML="Mode de démonstration hors ligne. Exporte une sauvegarde ou un HTML autonome après synchronisation pour conserver un état plus complet.";
    populateCavitySelect();
    render();
  }else{
    if(els.offlineNotice)els.offlineNotice.style.display="none";
    Promise.allSettled([fetchOverpass(),fetchAddress(),fetchCadastre(),fetchCavities(),fetchElevation()]).then(()=>updateSnapshotUI());
  }
}
bootAtlas();
