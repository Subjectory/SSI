# Rapport technique Blue Team : Horizon, façade de type Moodle

## 1. Contexte et objectifs

Dans le cadre de ce projet de SSI, l’objectif confié à l’équipe Blue Team consistait à concevoir une application web crédible, exploitable par une Red Team dans un scénario de type CTF, tout en conservant une apparence réaliste de produit pouvant être proposé dans un contexte professionnel. Le livrable ne devait donc pas ressembler à un laboratoire artificiel ou à une simple démonstration de vulnérabilités, mais à une plateforme cohérente, fonctionnelle et crédible au premier regard.

Le choix retenu a été de construire **Horizon by CorpHack**, une plateforme interne de gestion de la formation, de la documentation et de la communication d’entreprise. L’idée de “façade Moodle” n’a pas été interprétée comme une reproduction visuelle stricte de Moodle, mais comme la création d’un **LMS corporate simplifié**, inspiré des usages d’un portail de formation réel : catalogue de parcours, accès à des ressources, gestion de certificats, annonces internes, documents métiers et espaces d’administration.

Le projet poursuit donc un double objectif :

- proposer une **expérience utilisateur réaliste**, suffisamment crédible pour masquer l’intention pédagogique ;
- intégrer **dix vulnérabilités de niveau intermédiaire**, pensées pour être exploitées par la Red Team dans une logique cohérente de progression.

Dans cette démarche, la réussite Blue Team ne repose pas uniquement sur l’ajout de failles, mais sur l’équilibre entre trois dimensions : la crédibilité produit, la qualité de l’illusion fonctionnelle, et la maîtrise de la surface d’attaque introduite à des fins pédagogiques.

## 2. Présentation de la façade Moodle / LMS

### 2.1 Positionnement fonctionnel du produit

Horizon est présenté comme un **workspace RH et formation** destiné aux collaborateurs d’une entreprise fictive nommée CorpHack. La plateforme centralise plusieurs usages métier habituellement dispersés entre différents outils :

- la consultation de formations internes ;
- la demande d’accès à des parcours sensibles ;
- la consultation de ressources documentaires ;
- la lecture d’annonces internes ;
- la gestion du profil et des préférences utilisateur ;
- l’administration technique pour les comptes à privilèges.

Le produit s’inscrit donc dans une logique proche de celle d’un LMS d’entreprise, mais enrichi d’une couche documentaire et collaborative. Cette orientation permet de justifier naturellement la présence de multiples objets métier, de rôles distincts et de workflows internes, ce qui est utile à la fois pour la crédibilité du produit et pour la richesse des scénarios d’attaque.

### 2.2 Parcours utilisateur visibles

La façade fonctionnelle repose sur plusieurs écrans cohérents entre eux :

- **Accueil** : page marketing sobre présentant Horizon comme un produit B2B de gestion RH, formation et documentation ;
- **Connexion** : accès collaborateur avec mécanisme standard d’authentification et de mot de passe oublié ;
- **Tableau de bord** : synthèse des formations, documents et annonces ;
- **Formations** : catalogue, demandes d’accès, validation, ressources et prévisualisation de certificats ;
- **Documents** : hub documentaire avec consultation et publication ;
- **Annonces** : espace de communication interne avec commentaires ;
- **Profil** : consultation d’informations personnelles et métier ;
- **Paramètres** : préférences simples et configuration avancée ;
- **Admin** : back-office réservé aux administrateurs.

Cette organisation permet de simuler un produit complet et vraisemblable sans dépendre d’un framework lourd, tout en gardant une structure suffisamment lisible pour le développement et l’exploitation pédagogique.

### 2.3 Dissimulation de la logique CTF

Une partie importante du travail Blue Team a consisté à **faire disparaître visuellement le CTF** de l’expérience utilisateur nominale. Plusieurs choix ont été réalisés dans ce sens :

- les comptes seed ne sont plus affichés sur la page d’accueil ;
- les flags n’apparaissent pas dans l’interface normale sans exploitation ;
- la mailbox preview n’est pas mise en avant dans la navigation ;
- les préférences JSON avancées sont reléguées dans un espace secondaire ;
- les modules sensibles sont formulés en vocabulaire métier plutôt qu’en vocabulaire de test de sécurité.

Ce point est essentiel : une application de CTF trop démonstrative perd de sa valeur pédagogique, car elle révèle elle-même où se situent les points d’entrée. Ici, au contraire, la couche CTF est volontairement masquée derrière une façade LMS crédible.

## 3. Architecture technique retenue

### 3.1 Architecture générale

L’application repose sur une architecture volontairement simple, robuste et adaptée à un projet pédagogique :

- **frontend** en HTML/CSS/JavaScript vanilla, structuré en pages multiples ;
- **backend** en Node.js avec **Express** ;
- **base de données SQLite** initialisée et seedée automatiquement ;
- **authentification JWT** avec stockage côté client ;
- **stockage runtime** pour les uploads, ressources de formation, clés et messages simulés.

Ce choix technique répond à deux contraintes. D’une part, il permet un développement rapide et lisible. D’autre part, il facilite l’implantation contrôlée de vulnérabilités applicatives réalistes, sans complexité d’infrastructure inutile.

### 3.2 Organisation fonctionnelle

Le backend expose plusieurs familles d’API :

- authentification ;
- profil ;
- blog / annonces ;
- documents ;
- formations ;
- préférences ;
- administration ;
- endpoints internes réservés au serveur.

La base SQLite contient notamment les objets suivants :

- utilisateurs ;
- publications et commentaires ;
- documents ;
- formations ;
- demandes d’inscription ;
- ressources de formation ;
- messages de boîte mail simulée.

Le système est seedé avec plusieurs comptes représentatifs des rôles métier :

- `employee`
- `manager`
- `admin`

Ce modèle de rôles structure à la fois l’UX et les scénarios d’autorisation exploités dans le CTF.

### 3.3 Authentification et état applicatif

L’authentification repose sur des jetons JWT transmis côté client. Ce choix rend l’application proche d’un produit web moderne, tout en créant une surface d’attaque pertinente pour la Red Team. Le backend se charge ensuite de vérifier le jeton et de déterminer les droits associés au rôle porté par l’utilisateur.

L’état du challenge dépend d’un stockage runtime local comprenant :

- la base SQLite ;
- les documents importés ;
- les archives extraites ;
- les clés de signature ;
- les fichiers de flags ;
- la mailbox de récupération de mot de passe.

### 3.4 Déploiement de démonstration

Le projet a également été préparé pour un déploiement simple sur **Render**, avec une séparation entre frontend statique et backend web service. Ce point n’est pas central dans la logique pédagogique du rapport, mais il montre que l’application a été pensée comme un vrai produit déployable, et non uniquement comme un code local de démonstration.

## 4. Stratégie de sécurité mise en place

### 4.1 Philosophie Blue Team du projet

La stratégie Blue Team adoptée ici ne consiste pas à livrer une application réellement sécurisée, puisque le sujet impose l’implantation de vulnérabilités. L’enjeu est plutôt de **maîtriser la manière dont ces vulnérabilités sont intégrées** afin qu’elles servent un scénario cohérent sans casser la crédibilité du produit.

Autrement dit, la sécurité mise en place est une **sécurité de conception pédagogique**. Il s’agit de choisir où les surfaces sensibles apparaissent, comment elles s’insèrent dans les parcours métier, et comment l’application reste crédible malgré la présence volontaire de failles.

### 4.2 Cloisonnement de l’expérience

Plusieurs mécanismes contribuent à cette stratégie :

- distinction claire entre les rôles `employee`, `manager` et `admin` ;
- masquage de certaines interfaces selon le rôle ;
- séparation entre navigation métier et surfaces avancées ;
- présence d’un back-office distinct pour les opérations sensibles ;
- endpoints internes non exposés directement à l’utilisateur final ;
- isolation de la documentation CTF hors de l’interface.

Ce cloisonnement remplit une double fonction : rendre l’application plus crédible du point de vue produit, et offrir à la Red Team des surfaces d’attaque qui semblent découler d’un vrai besoin métier.

### 4.3 Mécanismes applicatifs présents malgré la dimension vulnérable

Même dans une version volontairement vulnérable, plusieurs mécanismes réalistes sont présents :

- gestion de rôles et d’autorisations visibles dans l’interface ;
- endpoints internes restreints au loopback pour les flux serveur ;
- espace d’administration réservé aux comptes privilégiés ;
- workflow d’accès aux formations sensibles ;
- système de reset de mot de passe crédible ;
- mécanisme de réinitialisation de l’état du challenge.

Ces éléments évitent l’effet “site de démonstration” et renforcent l’impression d’un produit réellement utilisé en interne.

### 4.4 Limite assumée de cette stratégie

Il est important de souligner que la première version livrée à la Red Team était **volontairement vulnérable et pédagogiquement contrôlée**. Cette version avait pour objectif de rendre les faiblesses exploitables dans un cadre de challenge, sans transformer l’interface en laboratoire artificiel.

Après réception du rapport de pentest Red Team, une seconde étape Blue Team a été menée afin de produire une **version remédiée** des vulnérabilités réellement exploitées. La stratégie de sécurité ne se limite donc plus à la mise en scène des faiblesses : elle inclut désormais leur correction ciblée dans le code, ainsi qu’une documentation des mesures appliquées.

## 5. Vulnérabilités intégrées dans la plateforme

La plateforme contient dix vulnérabilités intermédiaires. Six s’inscrivent dans une kill chain principale, et quatre jouent le rôle de quêtes latérales indépendantes.

### 5.1 Password Reset Poisoning

**Nom**  
Password Reset Poisoning

**Surface concernée**  
`POST /api/auth/forgot-password`

**Description technique**  
Le lien de réinitialisation de mot de passe est construit à partir d’informations issues de la requête, notamment `Host` ou `X-Forwarded-Host`. Cette logique permet à un attaquant de faire générer un lien de récupération pointant vers un domaine ou un hôte qu’il contrôle.

**Intérêt pédagogique**  
Cette vulnérabilité illustre les risques liés à la confiance accordée aux en-têtes HTTP dans les flux de sécurité critique, notamment lorsqu’un lien de récupération est généré côté serveur.

**Impact métier simulé**  
Dans un produit réel, une telle faille peut mener à une prise de contrôle de compte sans nécessiter les identifiants initiaux de la victime.

### 5.2 HTTP Parameter Pollution sur le reset

**Nom**  
HTTP Parameter Pollution

**Surface concernée**  
`POST /api/auth/forgot-password`

**Description technique**  
Le flux de récupération accepte plusieurs paramètres `email` interprétés de manière ambiguë. Le compte réellement ciblé et la mailbox de prévisualisation peuvent diverger, ce qui permet de détourner le flux de récupération.

**Intérêt pédagogique**  
Cette faille met en évidence les comportements indéterminés ou divergents lors du traitement de paramètres dupliqués, souvent sous-estimés en développement web.

**Impact métier simulé**  
Elle peut provoquer la livraison d’un message de sécurité sensible dans une mauvaise boîte, ou faciliter un détournement du processus de réinitialisation.

### 5.3 BOLA / IDOR sur les demandes de formation

**Nom**  
BOLA / IDOR métier

**Surface concernée**  
`GET /api/trainings/requests/:requestId`

**Description technique**  
Le détail d’une demande d’accès à une formation est accessible via un identifiant direct sans contrôle de propriété suffisamment strict. Un utilisateur authentifié peut consulter la demande d’un autre utilisateur.

**Intérêt pédagogique**  
Cette vulnérabilité montre qu’une authentification valide ne suffit pas : les contrôles d’autorisation doivent être vérifiés **au niveau de l’objet métier**.

**Impact métier simulé**  
Elle expose des métadonnées internes, des workflows et potentiellement des informations facilitant la suite de l’attaque.

### 5.4 Race Condition sur la confirmation de formation

**Nom**  
Race Condition

**Surface concernée**  
`POST /api/trainings/:id/confirm`

**Description technique**  
Des requêtes parallèles envoyées dans une même fenêtre temporelle permettent de forcer l’ouverture d’un accès à une formation sensible avant la validation managériale normalement attendue.

**Intérêt pédagogique**  
Cette faille introduit la notion de concurrence applicative, souvent absente des scénarios d’introduction, alors qu’elle représente un problème réel dans les workflows métier.

**Impact métier simulé**  
Un collaborateur non autorisé peut obtenir prématurément l’accès à des ressources restreintes.

### 5.5 SSRF / server-side XSS dans l’aperçu de certificat

**Nom**  
SSRF / Server-Side XSS dans le moteur de prévisualisation

**Surface concernée**  
`POST /api/trainings/:id/certificate-preview`

**Description technique**  
Le moteur d’aperçu de certificat accepte une URL de badge externe ou du HTML additionnel contrôlé par l’utilisateur. Cela peut conduire le serveur à récupérer une ressource interne ou à rendre du contenu non fiable.

**Intérêt pédagogique**  
Cette vulnérabilité permet de traiter des cas modernes de génération de contenu côté serveur, mêlant logique métier, fetch serveur et rendu HTML.

**Impact métier simulé**  
Elle peut conduire à la lecture de ressources internes, à une fuite d’informations et à un pivot vers des secrets ou endpoints internes.

### 5.6 JWT `kid` Key Confusion

**Nom**  
JWT `kid` Key Confusion

**Surface concernée**  
Middleware d’authentification JWT

**Description technique**  
La clé de vérification du token est choisie dynamiquement à partir du header `kid`, sans validation robuste. Un attaquant peut influencer le matériel de clé utilisé et forger un token administrateur.

**Intérêt pédagogique**  
Cette vulnérabilité est intéressante car elle dépasse les erreurs JWT les plus basiques et introduit une mauvaise gestion des secrets et des métadonnées de signature.

**Impact métier simulé**  
Elle permet une élévation de privilèges vers un compte admin sans compromission préalable d’un mot de passe administrateur.

### 5.7 Command Injection dans les diagnostics admin

**Nom**  
Command Injection

**Surface concernée**  
`POST /api/admin/diagnostics/ping`

**Description technique**  
La cible du diagnostic est concaténée directement dans une commande système exécutée via le shell. Une chaîne malveillante permet d’injecter des commandes supplémentaires.

**Intérêt pédagogique**  
Cette faille matérialise un pivot fort en fin de kill chain, avec un impact serveur direct et facilement démontrable.

**Impact métier simulé**  
Elle peut conduire à l’exécution de commandes arbitraires sur le serveur applicatif.

### 5.8 Server-Side Prototype Pollution sur les préférences

**Nom**  
Server-Side Prototype Pollution

**Surface concernée**  
`PATCH /api/preferences`

**Description technique**  
La fusion profonde du JSON de préférences ne filtre pas certaines clés spéciales, ce qui permet de modifier `Object.prototype` et d’influencer des objets créés ensuite dans l’application.

**Intérêt pédagogique**  
Cette vulnérabilité est particulièrement intéressante dans un environnement Node.js, car elle expose un risque moins évident qu’une injection classique.

**Impact métier simulé**  
Elle peut altérer des comportements transverses de l’application et débloquer des états inattendus.

### 5.9 Zip Slip sur l’import d’archives

**Nom**  
Zip Slip

**Surface concernée**  
`POST /api/trainings/import`

**Description technique**  
L’extraction d’une archive ZIP ne bloque pas suffisamment les chemins contenant une traversée de répertoire. Il devient possible d’écrire des fichiers hors du dossier attendu.

**Intérêt pédagogique**  
Cette faille illustre les risques liés au traitement de fichiers et d’archives importées, dans un contexte métier pourtant banal.

**Impact métier simulé**  
Un attaquant peut écraser ou créer des fichiers hors de la zone prévue, avec des conséquences sur la logique applicative ou le runtime.

### 5.10 Stored XSS dans les commentaires riches

**Nom**  
Stored XSS

**Surface concernée**  
`POST /api/blog/comments`

**Description technique**  
Les commentaires HTML sont stockés puis réaffichés sans sanitisation suffisante, permettant l’exécution de contenu actif lors de la consultation des annonces.

**Intérêt pédagogique**  
Cette vulnérabilité demeure classique mais reste essentielle dans un produit comportant des champs riches et des usages collaboratifs.

**Impact métier simulé**  
Elle peut compromettre la session d’autres utilisateurs, voler des données ou servir de point d’entrée vers d’autres actions.

### 5.11 Kill chain principale et quêtes latérales

La kill chain principale suit la logique suivante :

1. compromission du flux de reset ;
2. découverte d’objets métier via BOLA ;
3. contournement de validation sur une formation sensible ;
4. exploitation du moteur de certificat pour atteindre une ressource interne ;
5. forge d’un token JWT administrateur ;
6. pivot serveur via l’outil de diagnostic admin.

En parallèle, quatre vulnérabilités annexes peuvent être exploitées indépendamment :

- HTTP Parameter Pollution ;
- Prototype Pollution ;
- Zip Slip ;
- Stored XSS.

Cette structure offre une progression guidée mais non linéaire, ce qui augmente l’intérêt pédagogique du challenge.

## 6. Remédiation appliquée après le rapport Red Team

À la suite du rapport de pentest Red Team `CorpHack-Report.pdf`, la Blue Team a produit une version remédiée ciblant les six vulnérabilités effectivement exploitées pendant l’attaque. L’objectif de cette phase n’était plus de maintenir la jouabilité du CTF, mais de transformer les constats offensifs en corrections concrètes côté backend et, lorsque nécessaire, côté frontend.

Les remédiations ci-dessous ont donc été appliquées dans le code de la plateforme Horizon. Les flags associés aux failles corrigées ne doivent plus être retournés par les endpoints concernés.

### 6.1 VUL-01 - Password Reset et accès à la mailbox

**Constat Red Team**  
Le rapport Red Team montre qu’un attaquant pouvait exploiter le flux de réinitialisation de mot de passe pour identifier des comptes valides, générer un lien de reset, puis lire la mailbox simulée sans authentification. Cette faiblesse permettait une prise de contrôle de compte, notamment sur des comptes sensibles.

**Correction appliquée**  
Le lien de réinitialisation est désormais construit uniquement à partir de l’URL canonique configurée côté serveur avec `FRONTEND_PROTO` et `FRONTEND_HOST`. Les en-têtes contrôlables par le client, comme `Host` ou `X-Forwarded-Host`, ne sont plus utilisés pour générer le lien. La réponse de `POST /api/auth/forgot-password` ne renvoie plus ni nom de mailbox, ni URL de prévisualisation, et conserve un message générique afin de limiter l’énumération de comptes.

L’endpoint `GET /api/mail-preview` est maintenant protégé par authentification. Un utilisateur standard ne peut consulter que sa propre mailbox ; seul un administrateur conserve un droit de consultation plus large. Les paramètres `email` multiples sont également rejetés afin de supprimer le risque de pollution de paramètres sur ce flux.

**Effet sécurité**  
Un attaquant anonyme ne peut plus lire les messages de reset ni détourner la destination de la mailbox. La compromission de compte par simple connaissance d’une adresse e-mail n’est plus possible dans le flux corrigé.

**Vérification attendue**  
Une requête anonyme vers `/api/mail-preview` doit retourner `401`. Une tentative de lecture d’une mailbox appartenant à un autre utilisateur doit retourner `403`. Une requête de reset contenant un `X-Forwarded-Host` malveillant ne doit pas modifier le domaine du lien généré.

### 6.2 VUL-02 - BOLA / IDOR sur les demandes de formation

**Constat Red Team**  
La Red Team a démontré qu’un utilisateur authentifié pouvait consulter une demande de formation appartenant à un autre utilisateur en modifiant simplement l’identifiant numérique dans `GET /api/trainings/requests/:requestId`.

**Correction appliquée**  
Un contrôle d’autorisation objet a été ajouté sur cette route. Le serveur vérifie maintenant que l’utilisateur courant est bien le propriétaire de la demande, ou qu’il dispose d’un rôle autorisé (`manager` ou `admin`). Si cette condition n’est pas respectée, l’accès est refusé.

Le champ `reviewCode` est également masqué pour les utilisateurs non privilégiés. Même lorsqu’un utilisateur consulte sa propre demande, il ne reçoit donc plus de code de revue sensible si son rôle ne le justifie pas.

**Effet sécurité**  
L’authentification seule ne suffit plus à accéder aux objets métier. Les demandes de formation sont protégées par un contrôle de propriété et les informations sensibles ne sont exposées qu’aux rôles légitimes.

**Vérification attendue**  
Un utilisateur peut lire sa propre demande, mais reçoit `403` lorsqu’il tente de lire celle d’un autre collaborateur. Un compte `manager` ou `admin` peut consulter les demandes nécessaires à son rôle.

### 6.3 VUL-03 - Race Condition sur la confirmation de formation

**Constat Red Team**  
Le rapport Red Team indique qu’en envoyant plusieurs requêtes de confirmation en parallèle, il était possible d’obtenir l’accès à une formation restreinte avant validation managériale.

**Correction appliquée**  
La logique volontairement vulnérable basée sur une fenêtre temporelle de concurrence a été retirée. Le serveur n’accorde désormais l’accès à une formation nécessitant validation que si l’état `approved_by_manager` est déjà positionné. Les requêtes concurrentes incrémentent au plus un compteur de tentative, mais ne peuvent plus transformer une demande non approuvée en accès actif.

Pour les formations qui ne nécessitent pas de validation, la confirmation reste possible normalement après vérification du code attendu. Le comportement métier légitime est donc conservé.

**Effet sécurité**  
La validation managériale redevient une condition stricte pour accéder aux ressources sensibles. Le timing des requêtes ne permet plus de contourner le workflow.

**Vérification attendue**  
Deux confirmations simultanées sur une formation non approuvée doivent retourner un état en attente et ne doivent jamais produire `accessGranted: true` ni le flag associé à la race condition.

### 6.4 VUL-04 - JWT forgé et confusion `kid`

**Constat Red Team**  
La Red Team a identifié une faiblesse dans la gestion du champ `kid` des JWT. Le serveur choisissait dynamiquement la clé de vérification à partir d’une valeur fournie dans le header du token, ce qui ouvrait la voie à une confusion de clé et à la forge d’un jeton administrateur.

**Correction appliquée**  
La résolution libre du `kid` a été supprimée. Le middleware JWT utilise désormais un identifiant de clé applicatif strictement attendu. Tout token présentant un `kid` différent est rejeté avant validation. Le secret JWT est chargé depuis `process.env.JWT_SECRET` lorsqu’il est disponible, avec un fallback local uniquement destiné à la démonstration.

La vérification ne lit plus de fichier à partir d’un chemin contrôlable par le client. Le `kid` redevient une métadonnée contrôlée par le serveur, et non un sélecteur libre de matériel cryptographique.

**Effet sécurité**  
Un attaquant ne peut plus forger un token admin en manipulant le header JWT. La chaîne d’attaque menant à l’accès administrateur persistant est coupée.

**Vérification attendue**  
Un token normal émis par l’application reste accepté. Un token forgé avec un `kid` différent de l’identifiant attendu doit être rejeté avec `401`. L’endpoint `/api/admin` ne doit plus retourner de flag lié au `kid`.

### 6.5 VUL-05 - Command Injection dans les diagnostics admin

**Constat Red Team**  
Le module de diagnostic admin concaténait directement la cible fournie par l’utilisateur dans une commande `ping` exécutée via shell. La Red Team a pu injecter des opérateurs système et obtenir une exécution de commandes côté serveur.

**Correction appliquée**  
L’exécution via chaîne shell a été remplacée par `execFile`, avec passage des arguments dans un tableau séparé. La cible est validée avant exécution : seules les adresses IP ou les hostnames simples sont acceptés. Les caractères nécessaires à une injection shell, comme `;`, `&&`, `|`, les espaces ou les séquences de commande, sont donc rejetés par validation.

La réponse du diagnostic ne retourne plus de flag, ni de chemin local vers un fichier pivot. Les informations internes inutiles à l’exploitation normale de l’outil ont été retirées.

**Effet sécurité**  
Le diagnostic reste utilisable par un administrateur pour tester une cible réseau simple, mais il ne permet plus d’exécuter une commande arbitraire sur le serveur.

**Vérification attendue**  
Une cible valide comme `127.0.0.1` doit fonctionner. Une cible contenant `;`, `&&`, `|` ou un espace doit être refusée avec une erreur de validation, sans exécution de commande additionnelle.

### 6.6 VUL-06 - Server-Side Prototype Pollution

**Constat Red Team**  
La Red Team a montré que `PATCH /api/preferences` acceptait une fusion profonde de JSON sans filtrage des clés dangereuses. Une charge contenant `__proto__`, `constructor` ou `prototype` pouvait polluer les prototypes JavaScript côté serveur.

**Correction appliquée**  
La fusion profonde arbitraire a été remplacée par une normalisation stricte des préférences autorisées. Seuls les champs `locale`, `density` et `homeWidgets` sont acceptés. Toute clé inconnue ou dangereuse est rejetée, y compris lorsqu’elle apparaît dans une structure imbriquée.

Les valeurs sont également validées : la locale doit correspondre aux choix prévus par l’interface, la densité doit appartenir à la liste autorisée, et les widgets doivent être fournis sous forme de liste de chaînes.

**Effet sécurité**  
L’utilisateur ne peut plus injecter de propriétés spéciales dans les objets serveur. Les préférences redeviennent un objet métier limité, et non un point d’entrée vers le comportement global de Node.js.

**Vérification attendue**  
Un payload de préférences valide doit être accepté. Un payload contenant `__proto__`, `constructor` ou `prototype` doit retourner `400`. L’appel `GET /api/preferences` ne doit plus révéler le flag de prototype pollution.

### 6.7 Synthèse des corrections

Les six vulnérabilités exploitées par la Red Team ont été corrigées dans le code :

- le reset password ne permet plus la lecture anonyme de mailbox ni la génération de liens contrôlés par les en-têtes HTTP ;
- les demandes de formation sont protégées par un contrôle d’autorisation au niveau de l’objet ;
- la confirmation de formation ne peut plus être forcée par concurrence ;
- la vérification JWT n’accepte plus de `kid` arbitraire ;
- les diagnostics admin n’utilisent plus de shell et valident strictement la cible ;
- les préférences utilisateur sont validées par schéma simple et ne permettent plus la pollution de prototype.

Ces corrections transforment la version initialement vulnérable en version sécurisée ciblée sur les constats du pentest. Certaines vulnérabilités pédagogiques non exploitées dans le rapport Red Team, comme la SSRF du certificat, le Zip Slip ou le Stored XSS, restent documentées comme surfaces CTF historiques, mais elles n’entraient pas dans le périmètre de cette phase de remédiation.

## 7. Conclusion

Le projet Horizon répond à une contrainte pédagogique particulière : concevoir un produit apparemment crédible, cohérent et vendable, tout en intégrant volontairement des vulnérabilités intermédiaires destinées à une Red Team. La difficulté ne résidait donc pas uniquement dans l’implémentation technique, mais dans la capacité à **faire coexister réalisme produit et surface d’attaque maîtrisée**.

Le choix d’une façade de type Moodle/LMS corporate s’est révélé pertinent. Il permet de justifier naturellement des rôles différenciés, des workflows d’accès, des documents internes, des annonces riches et une administration technique. L’application obtenue n’est pas une simple démo de failles : elle simule un véritable portail interne de formation et de documentation.

Du point de vue Blue Team, la valeur du projet réside précisément dans cet équilibre. D’un côté, Horizon offre une expérience cohérente et crédible. De l’autre, il constitue un support pédagogique riche pour l’exploitation contrôlée de vulnérabilités réalistes. La phase de remédiation ajoute une dernière dimension au projet : elle montre comment transformer les constats Red Team en corrections concrètes, vérifiables et directement appliquées dans le code.

En conclusion, Horizon remplit bien le rôle attendu d’une **façade Moodle/LMS corporate crédible**, tout en servant de base solide à un scénario CTF structuré, progressif et pédagogiquement pertinent. La version remédiée corrige les six failles exploitées dans le rapport Red Team et fournit une base plus saine pour discuter des bonnes pratiques de sécurisation applicative.
