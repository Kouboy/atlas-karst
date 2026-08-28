const SOURCE_REGISTRY_SCHEMA_VERSION=1;
const SOURCE_REGISTRY=Object.freeze([
  {id:"openstreetmap",statusKey:"osm",statusElementId:"osmStatus",label:"Surface cartographique",provider:"OpenStreetMap",category:"cartographie",coverage:"mondiale",refresh:"à la demande",storage:"cache local",portable:"referenced",metric:"osm",license:"ODbL",url:"https://www.openstreetmap.org/copyright"},
  {id:"adresse",statusKey:"address",statusElementId:"addressStatus",label:"Adresse de référence",provider:"Base Adresse Nationale / Géoplateforme",category:"adresse",coverage:"France",refresh:"à la création",storage:"extrait local",portable:"embedded",metric:"address",license:"Licence Ouverte 2.0",url:"https://adresse.data.gouv.fr/"},
  {id:"cadastre",statusKey:"cadastre",statusElementId:"cadastreStatus",label:"Parcelles et bâtiments",provider:"DGFiP / Etalab / IGN",category:"foncier",coverage:"France",refresh:"à la demande",storage:"cache local",portable:"referenced",metric:"cadastre",license:"Licence Ouverte 2.0",url:"https://cadastre.data.gouv.fr/"},
  {id:"cavites",statusKey:"cavities",statusElementId:"cavityStatus",label:"Cavités documentées",provider:"Géorisques / BRGM",category:"sous-sol documenté",coverage:"France",refresh:"à la création",storage:"extrait local",portable:"embedded",metric:"cavities",license:"Licence Ouverte 2.0",url:"https://www.georisques.gouv.fr/"},
  {id:"cartofriches",statusKey:"cartofriches",statusElementId:"cartofrichesStatus",label:"Friches",provider:"Cartofriches / Cerema",category:"occupation du sol",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"cartofriches",license:"Licence Ouverte 2.0",url:"https://cartofriches.cerema.fr/"},
  {id:"culture",statusKey:"heritage",statusElementId:"heritageStatus",label:"Patrimoine officiel",provider:"Ministère de la Culture",category:"patrimoine",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"culture",license:"Licence Ouverte 2.0",url:"https://www.pop.culture.gouv.fr/"},
  {id:"wikipedia",statusKey:"heritage",statusElementId:"heritageStatus",label:"Curiosités encyclopédiques",provider:"Wikipédia francophone",category:"documentation collaborative",coverage:"mondiale",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"wikipedia",license:"CC BY-SA",url:"https://fr.wikipedia.org/"},
  {id:"bss",statusKey:"bss",statusElementId:"bssStatus",label:"Forages et piézomètres",provider:"BRGM / Hub’Eau",category:"sous-sol documenté",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"bss",license:"Licence Ouverte 2.0",url:"https://infoterre.brgm.fr/"},
  {id:"hydrometry",statusKey:"hydrometry",statusElementId:"hydrometryStatus",label:"Stations hydrométriques",provider:"Hub’Eau / PHyC / Vigicrues",category:"hydrologie de surface",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"hydrometry",license:"Licence Ouverte 2.0",url:"https://hubeau.eaufrance.fr/page/api-hydrometrie"},
  {id:"biodiversity",statusKey:"biodiversity",statusElementId:"biodiversityStatus",label:"Occurrences de biodiversité",provider:"GBIF",category:"biodiversité documentée",coverage:"mondiale",refresh:"manuelle",storage:"extrait agrégé local",portable:"embedded",metric:"biodiversity",license:"Selon chaque jeu source GBIF",url:"https://www.gbif.org/"},
  {id:"nature",statusKey:"nature",statusElementId:"natureStatus",label:"Espaces naturels remarquables",provider:"API Carto Nature · IGN / INPN",category:"protection et inventaire écologique",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"nature",license:"Licence Ouverte 2.0",url:"https://apicarto.ign.fr/api/doc/nature"},
  {id:"landcover",statusKey:"landcover",statusElementId:"landCoverStatus",label:"Occupation du sol",provider:"BD CARTO® · IGN",category:"occupation du sol",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"landcover",license:"Licence Ouverte 2.0",url:"https://geoservices.ign.fr/bdcarto"},
  {id:"geology",statusKey:"geology",statusElementId:"geologyStatus",label:"Géologie régionale",provider:"BRGM",category:"géologie",coverage:"France",refresh:"manuelle",storage:"extrait local",portable:"embedded",metric:"geology",license:"Licence Ouverte 2.0",url:"https://geoservices.brgm.fr/geologie"},
  {id:"casias",statusKey:"casias",statusElementId:"casiasStatus",label:"Mémoire industrielle CASIAS",provider:"Géorisques / BRGM",category:"histoire industrielle et services",coverage:"France",refresh:"consultation manuelle",storage:"aucune donnée inférée",portable:"referenced",metric:"casias",license:"Selon le portail source",url:"https://www.georisques.gouv.fr/donnees/bases-de-donnees/inventaire-historique-de-sites-industriels-et-activites-de-service"},
  {id:"relief",statusKey:"elevation",statusElementId:"elevationStatus",label:"Relief",provider:"IGN / Copernicus / Open-Meteo",category:"altimétrie",coverage:"mondiale avec priorité France",refresh:"à la création",storage:"cache local",portable:"referenced",metric:"elevation",license:"Selon le fournisseur",url:"https://geoservices.ign.fr/rgealti"}
]);
const sourceRegistryRuntime={ready:true,schema:SOURCE_REGISTRY_SCHEMA_VERSION,catalogRenders:0,attributionRenders:0,statusUpdates:0,lastStatusKey:"—",lastError:""};

function sourceDefinition(id){return SOURCE_REGISTRY.find(source=>source.id===id)||null}
function sourceDefinitionsForStatus(statusKey){return SOURCE_REGISTRY.filter(source=>source.statusKey===statusKey)}
function sourceMetricCount(source,data={}){
  const heritage=Array.isArray(data.heritageItems)?data.heritageItems:[];
  if(source.metric==="osm")return data.osm?.length||0;
  if(source.metric==="address")return data.address?1:0;
  if(source.metric==="cadastre")return (data.cadastreBuildings?.length||0)+(data.cadastreParcels?.length||0);
  if(source.metric==="cavities")return data.officialCavities?.length||0;
  if(source.metric==="cartofriches")return data.cartofriches?.length||0;
  if(source.metric==="culture")return heritage.filter(item=>item.category!=="wikipedia").length;
  if(source.metric==="wikipedia")return heritage.filter(item=>item.category==="wikipedia").length;
  if(source.metric==="bss")return data.bss?.length||0;
  if(source.metric==="hydrometry")return data.hydrometry?.length||0;
  if(source.metric==="biodiversity")return data.biodiversity?.length||0;
  if(source.metric==="nature")return data.natureAreas?.length||0;
  if(source.metric==="landcover")return data.landCover?.length||0;
  if(source.metric==="geology")return data.geology?.length||0;
  if(source.metric==="elevation")return data.elevation?1:0;
  return 0;
}
function sourceRetrievedAt(source,data={}){
  if(source.id==="openstreetmap")return String(data.osmMeta?.loadedAt||"");
  const collections={cavities:data.officialCavities,cartofriches:data.cartofriches,bss:data.bss,hydrometry:data.hydrometry,biodiversity:data.biodiversity,nature:data.natureAreas,landcover:data.landCover,geology:data.geology};
  let collection=source.metric==="culture"||source.metric==="wikipedia"?data.heritageItems:collections[source.metric]||data[source.metric];
  if(Array.isArray(collection)&&source.metric==="culture")collection=collection.filter(item=>item?.category!=="wikipedia");
  if(Array.isArray(collection)&&source.metric==="wikipedia")collection=collection.filter(item=>item?.category==="wikipedia");
  if(Array.isArray(collection))return String(collection.find(item=>item?.syncedAt)?.syncedAt||"");
  return "";
}
function sourceReferenceForSnapshot(source,data={}){
  const count=sourceMetricCount(source,data),embedded=source.portable==="embedded"&&count>0,consulted=count>0;
  return {id:source.id,label:source.label,provider:source.provider,license:source.license,url:source.url,count,disposition:embedded?"embedded":consulted?"consulted":"referenced",retrievedAt:sourceRetrievedAt(source,data)};
}
function sourceReferencesForSnapshot(snapshot){
  const data=snapshot?.data||{};
  return SOURCE_REGISTRY.map(source=>sourceReferenceForSnapshot(source,data)).filter(reference=>reference.count>0);
}
function sourceCatalogStatus(source){
  const element=document.getElementById(source.statusElementId);
  return {state:element?.classList.contains("ok")?"ok":element?.classList.contains("bad")?"bad":"pending",label:(element?.textContent||"en attente").trim()};
}
function updateSourceCatalogStatus(statusKey){
  for(const source of sourceDefinitionsForStatus(statusKey)){
    const target=els.sourceCatalogList?.querySelector(`[data-source-id="${source.id}"] [data-source-catalog-status]`);if(!target)continue;
    const status=sourceCatalogStatus(source);target.className=`source-catalog-status ${status.state}`;target.textContent=status.label;
  }
}
function setSourceStatus(statusKey,status,label){
  state.load[statusKey]=status;sourceRegistryRuntime.statusUpdates++;sourceRegistryRuntime.lastStatusKey=statusKey;
  const definitions=sourceDefinitionsForStatus(statusKey),element=document.getElementById(definitions[0]?.statusElementId||"");
  if(element){element.className=status==="ok"?"ok":status==="bad"?"bad":"pending";element.textContent=label;element.dataset.sourceStatus=status}
  updateSourceCatalogStatus(statusKey);
}
function renderSourceCatalog(){
  if(!els.sourceCatalogList)return;
  const fragment=document.createDocumentFragment();
  for(const source of SOURCE_REGISTRY){
    const entry=document.createElement("article");entry.className="source-catalog-entry";entry.dataset.sourceId=source.id;
    const heading=document.createElement("div");heading.className="source-catalog-heading";
    const link=document.createElement("a");link.href=source.url;link.target="_blank";link.rel="noopener";link.textContent=source.provider;
    const status=document.createElement("span");status.dataset.sourceCatalogStatus="";
    heading.append(link,status);
    const detail=document.createElement("div");detail.className="source-catalog-detail";detail.textContent=`${source.category} · ${source.coverage} · ${source.refresh} · ${source.portable==="embedded"?"extrait conservé dans le carnet":"donnée à resynchroniser"}`;
    const license=document.createElement("div");license.className="source-catalog-license";license.textContent=source.license;
    entry.append(heading,detail,license);fragment.appendChild(entry);
  }
  els.sourceCatalogList.replaceChildren(fragment);sourceRegistryRuntime.catalogRenders++;
  for(const key of new Set(SOURCE_REGISTRY.map(source=>source.statusKey)))updateSourceCatalogStatus(key);
}
function renderSourceAttribution(){
  if(!els.mainAttribution)return;
  const sources=SOURCE_REGISTRY.map(source=>`${source.provider} (${source.license})`).join(" ; ");
  els.mainAttribution.textContent=`Attributions : ${sources}. Le repère de départ et les observations locales restent privés tant que l’utilisateur ne partage pas son carnet.`;
  sourceRegistryRuntime.attributionRenders++;
}
function initializeSourceRegistryUI(){
  try{
    for(const source of SOURCE_REGISTRY){const element=document.getElementById(source.statusElementId);if(element)element.dataset.sourceIds=sourceDefinitionsForStatus(source.statusKey).map(item=>item.id).join(" ")}
    renderSourceCatalog();renderSourceAttribution();sourceRegistryRuntime.lastError="";
  }catch(error){sourceRegistryRuntime.lastError=String(error?.message||error)}
}
function sourceRegistryDiagnosticText(){
  return SOURCE_REGISTRY.map(source=>{const status=sourceCatalogStatus(source);return `${source.id}=${status.state}:${status.label}`}).join(" · ");
}
