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
  return canvasCellRect(x,y);
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
  positionCanvasMarker(marker,p.x,p.y,true);
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
