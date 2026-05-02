import type { Locale } from '../i18n/types'

export type LegalSection = {
  id: string
  title: string
  /** Libellé court pour le sommaire (les titres complets restent en <h2>). */
  tocLabel?: string
  paragraphs: string[]
}

export type LegalBundle = {
  pageTitle: string
  pageIntro: string
  tocLabel: string
  sections: LegalSection[]
  reviewNote: string
}

const REPO_ISSUES = 'https://github.com/StrainUS/DashboardRayls/issues'
const ECONOMIE_MEDIATION = 'https://www.economie.gouv.fr/mediation-conso'

export const legalBundle: Record<Locale, LegalBundle> = {
  fr: {
    pageTitle: 'Informations légales',
    pageIntro:
      'Document d’information à caractère juridique : mentions légales, conditions générales d’utilisation (CGU) et politique de confidentialité / données personnelles.',
    tocLabel: 'Sommaire',
    sections: [
      {
        id: 'mentions',
        title: 'Mentions légales',
        tocLabel: 'Mentions',
        paragraphs: [
          '**Éditeur du site et du service** : **StrainUS**, titulaire des droits d’auteur et droits voisins sur le logiciel et la documentation publiés dans le dépôt associé (voir le fichier **LICENSE**). StrainUS exerce son activité **depuis la France** (Union européenne).',
          '**Identification de l’éditeur (LCEN)** : conformément à l’**article 6-I et suivants de la loi n° 2004-575 du 21 juin 2005** pour la confiance dans l’économie numérique, selon les cas, doivent notamment être portées à la connaissance du public : **dénomination** ou raison sociale, **forme juridique**, **siège social**, **capital social** le cas échéant, **immatriculation** (RCS / RM et ville), **SIRET** ou identifiant équivalent, **TVA intracommunautaire** si applicable, nom du **directeur de la publication**, et **coordonnées** de contact. StrainUS **actualisera** ces mentions sur cette page (ou support équivalent) **dès qu’elles sont établies** pour son activité.',
          `**Contact** : pour toute question relative à ce service : via l’espace *Issues* du dépôt GitHub [StrainUS/DashboardRayls](${REPO_ISSUES}), et, lorsqu’il sera communiqué, l’**adresse électronique de contact professionnel** de StrainUS.`,
          '**Hébergement** : le contenu statique peut être diffusé via **GitHub Pages** ; **hébergeur** : **GitHub, Inc.**, 88 Colin P. Kelly Jr Street, San Francisco, CA 94107, États-Unis — [github.com](https://github.com). L’**hébergeur** est juridiquement **distinct** de l’**éditeur** du service.',
          '**Propriété intellectuelle — contenu StrainUS** : le code, la documentation et les éléments graphiques propres au logiciel déployé sont protégés ; toute reproduction ou représentation non autorisée est interdite sous réserve des exceptions légales et de l’accord écrit de StrainUS (voir **LICENSE**).',
          '**Marques et signes distinctifs tiers** : les dénominations, logos et marques cités (dont **Rayls**, **CoinGecko**, noms d’échanges ou de fournisseurs) appartiennent à leurs titulaires. Leur mention est **strictement descriptive et informative** ; **aucune** affiliation, parrainage ou licence n’est implicite.',
          '**Indépendance** : cet outil **n’est pas** un produit officiel des entités citées ; il présente des informations publiques et des réponses de services tiers au moment de la requête.',
          `**Médiation de la consommation** : en cas de litige avec un **consommateur** n’ayant pas trouvé de solution directe avec StrainUS, ce dernier informe qu’il peut être saisi, selon les cas, d’un **dispositif de médiation** conformément aux articles **L. 612-1 et suivants** du code de la consommation. Informations générales : [economie.gouv — médiation conso](${ECONOMIE_MEDIATION}). Les **coordonnées du médiateur** éventuellement désigné par StrainUS seront **reproduites ici** lorsque la réglementation applicable l’impose.`,
        ],
      },
      {
        id: 'cgu',
        title: 'Conditions générales d’utilisation (CGU)',
        tocLabel: 'CGU',
        paragraphs: [
          '**Champ d’application** : les présentes CGU régissent l’accès et l’utilisation du **service en ligne** consistant en une application technique exécutée dans le **navigateur** (tableau de bord d’information sur le réseau public Rayls et données de marché agrégées). Le service est mis à disposition **sans contrepartie pécuniaire** pour l’utilisateur final, sous réserve des coûts de connexion et d’équipement à sa charge.',
          '**Acceptation** : toute utilisation du service vaut **acceptation pleine et entière** des présentes CGU. Si vous n’y consentez pas, vous devez **cesser** d’utiliser le service.',
          '**Accès au service** : StrainUS s’efforce d’en assurer l’accessibilité mais **ne garantit pas** une disponibilité **ininterrompue** ni l’absence d’erreurs. L’accès peut être **suspendu** pour maintenance, mise à jour ou cas de **force majeure** au sens du droit français.',
          '**Obligations de l’utilisateur** : vous vous engagez à utiliser le service **conformément aux lois et règlements** applicables, de façon **loyale**, sans porter atteinte aux droits de tiers, sans tenter de compromettre la sécurité ou la disponibilité du service ou des systèmes connectés, et sans contourner les mesures techniques normatives des opérateurs tiers dans un but illicite.',
          '**Propriété intellectuelle** : la structure générale, les composants logiciels, textes et éléments d’interface **proprement StrainUS** demeurent la propriété exclusive de StrainUS ou de ses ayants droit. Aucune licence d’exploitation commerciale du logiciel n’est concédée par les seules présentes CGU.',
          '**Liens hypertextes** : le service peut permettre d’accéder à des **sites tiers** ; StrainUS **ne maîtrise pas** leur contenu ni leurs politiques ; l’utilisateur les consulte **sous sa propre responsabilité**.',
          '**Données personnelles** : le traitement des données est décrit dans la **politique de confidentialité** ci-dessous.',
          '**Rôle informatif** : le contenu affiché **ne constitue pas** un conseil en **investissement**, en **finance**, en **fiscalité** ou en **droit**.',
          '**Exactitude des informations** : les données proviennent de **sources tierces** et sont affichées **à titre indicatif** ; StrainUS **ne garantit pas** leur exactitude, leur exhaustivité ni leur actualité.',
          '**Limitation de responsabilité** : dans les limites **autorisées par les textes en vigueur**, la **responsabilité de StrainUS** ne saurait être engagée pour les **dommages indirects** ou immatériels (notamment perte de données, perte d’exploitation, manque à gagner) résultant de l’utilisation ou de l’impossibilité d’utiliser le service, y compris en cas de défaillance d’un **tiers** ou d’**API**.',
          '**Force majeure** : StrainUS ne saurait être tenue responsable de tout manquement résultant d’un cas de force majeure ou d’un événement hors de son contrôle raisonnable.',
          '**Modification des CGU** : StrainUS peut **adapter** les présentes CGU ; la **version en ligne** au moment de la consultation fait foi. Il appartient à l’utilisateur de s’y reporter régulièrement.',
          '**Droit applicable — litiges** : les présentes CGU sont régies par le **droit français**. À défaut de **règlement amiable**, les **tribunaux français** sont **compétents**, sous réserve des **dispositions impératives** notamment en matière de **consommation** ou de compétence territoriale spéciale.',
          '**Nullité partielle** : si une clause était déclarée **invalide**, les autres **conservent** leur effet dans la mesure permise.',
        ],
      },
      {
        id: 'confidentialite',
        title: 'Politique de confidentialité — données personnelles',
        tocLabel: 'Confidentialité',
        paragraphs: [
          '**Responsable du traitement** : **StrainUS**, tel qu’identifié en **mentions légales**, agit comme **responsable de traitement** pour les traitements qu’il met en œuvre **directement** dans le cadre de ce service. **Coordonnées** : voir la section contact des mentions légales.',
          '**Nature du service** : application **100 % côté navigateur** dans ce dépôt ; **pas** de création de compte obligatoire ni de **serveur applicatif** StrainUS fourni ici pour héberger un fichier de profils utilisateurs.',
          '**Données traitées — finalités — bases légales (transparence RGPD)** : (1) **Affichage et fonctionnement** du service : requêtes techniques émises par votre terminal vers des serveurs (hébergement statique, API, RPC, etc.) — **base** : **intérêt légitime** de StrainUS à fournir un service d’information et **exécution** des mesures précontractuelles / contractuelles le cas échéant ; (2) **Préférences** (ex. langue) stockées **localement** sur votre appareil via le navigateur — **base** : **consentement** matérialisé par votre choix dans l’interface ou équivalent ; vous pouvez **retirer** ce consentement en effaçant les données du site dans votre navigateur.',
          '**Catégories de données** : identifiants et journaux **techniques** pouvant être générés par les interconnexions réseau (adresse IP, journaux serveur du **prestataire d’hébergement** ou des **API** consultées), selon leurs politiques ; **contenu** de stockage local limité aux **préférences** d’affichage.',
          '**Destinataires** : **prestataires** impliqués dans la diffusion du site (ex. hébergement) et **opérateurs tiers** dont les services sont sollicités par l’application (RPC, agrégateurs de marché, etc.), **chacun** en qualité déterminée par sa propre politique.',
          '**Transferts hors Union européenne** : certains prestataires (ex. hébergement aux **États-Unis**) peuvent traiter des données en dehors de l’UE ; le cas échéant, des **garanties appropriées** peuvent être mises en œuvre (notamment **clauses contractuelles types** de la Commission européenne), conformément au **RGPD**.',
          '**Durées de conservation** : données en **stockage local** jusqu’à **effacement** par l’utilisateur ; données détenues par des **tiers** selon leurs **durées** propres, auxquelles StrainUS n’impose pas de maîtrise directe dans ce modèle.',
          '**Vos droits** : dans les conditions prévues par le **RGPD** et la **loi « Informatique et libertés »**, vous disposez de droits d’**accès**, de **rectification**, d’**effacement**, de **limitation**, d’**opposition**, de **portabilité** (le cas échéant) et du droit de définir des **directives** post-mortem. Vous pouvez les exercer auprès de StrainUS via les **moyens de contact** indiqués en mentions légales. Vous pouvez introduire une **réclamation** auprès de la **CNIL** : [cnil.fr](https://www.cnil.fr).',
          '**Délégué à la protection des données (DPO)** : StrainUS **ne** communique **pas** la désignation d’un DPO sur cette page tant qu’aucune obligation légale de désignation ne s’impose ou qu’aucun DPO n’est nommé ; les demandes peuvent être adressées au **responsable du traitement** aux coordonnées ci-dessus.',
          '**Sous-traitance** : lorsque StrainUS recourt à des sous-traitants, il veille, dans la mesure de ses moyens, à ce que des **obligations** conformes au RGPD **encadrent** leurs interventions.',
          '**Sécurité** : StrainUS met en œuvre les mesures **appropriées** compte tenu de la nature du service (application frontale) ; la **sécurité absolue** du réseau Internet ne peut être garantie.',
          '**Signalement prudent (sécurité informatique)** : pour signaler une **vulnérabilité** susceptible d’affecter ce service, **contactez StrainUS** par les moyens indiqués en **mentions légales** ou tout **canal privé** dédié. **Ne divulguez pas** publiquement de secrets, clés, données sensibles ni la marche détaillée d’une exploitation sans accord préalable.',
          '**Évolution** : la présente politique peut être **mise à jour** ; la version **affichée** sur le site fait foi.',
        ],
      },
    ],
    reviewNote:
      '**Clause de réserve** : ce document vise une **exposition professionnelle** des engagements et informations usuelles pour un **service en ligne** édité depuis la **France**. Il **ne dispense pas** d’un **accompagnement juridique** (statut exact de StrainUS, obligations sectorielles, médiateur désigné, registre des traitements, analyse d’impact, etc.). StrainUS pourra l’**adapter** après **relecture par un avocat** ou un **DPO**.',
  },
  en: {
    pageTitle: 'Legal information',
    pageIntro:
      'Legal notice, general terms of use, and privacy / personal data policy for this browser-based service.',
    tocLabel: 'On this page',
    sections: [
      {
        id: 'mentions',
        title: 'Legal notice',
        tocLabel: 'Notice',
        paragraphs: [
          '**Publisher**: **StrainUS** is the publisher of this online service and holds copyright and related rights in the software and documentation in the associated repository (see **LICENSE**). StrainUS operates from **France** (European Union).',
          '**Identification (transparency)**: depending on applicable French law (notably Law no. 2004-575 of 21 June 2005 on confidence in the digital economy), commercial publishers must display identification details (legal name, legal form, registered office, registration numbers where applicable, publication director, contact). StrainUS will **keep this page updated** with any such details that apply to its activity.',
          `**Contact**: for questions about this service, use the *Issues* section of [StrainUS/DashboardRayls](${REPO_ISSUES}) on GitHub, and any **professional contact email** StrainUS may publish later.`,
          '**Hosting**: static content may be served via **GitHub Pages**. **Host**: **GitHub, Inc.**, 88 Colin P. Kelly Jr Street, San Francisco, CA 94107, USA — [github.com](https://github.com). The **host** is legally **distinct** from the **publisher**.',
          '**StrainUS intellectual property**: software, documentation, and original assets are protected; unauthorised reproduction is prohibited subject to legal exceptions and StrainUS’s written consent (see **LICENSE**).',
          '**Third-party trademarks**: names and marks cited (including **Rayls**, **CoinGecko**, exchanges) belong to their owners. Use here is **descriptive only**; **no** affiliation or endorsement is implied.',
          '**Independence**: this tool is **not** an official product of those entities.',
          `**Consumer mediation (information)**: EU/French consumer rules may require **out-of-court** dispute resolution. General information (French context): [economie.gouv — mediation](${ECONOMIE_MEDIATION}). Any **named mediator** StrainUS must appoint will be listed here when required.`,
        ],
      },
      {
        id: 'cgu',
        title: 'Terms of use',
        tocLabel: 'Terms',
        paragraphs: [
          '**Scope**: these terms govern use of the **browser-based** informational dashboard (public Rayls network and aggregated market data). The service is provided **free of charge** to end users (connectivity and equipment remain your cost).',
          '**Acceptance**: use of the service means you **accept** these terms. If you do not agree, **stop** using the service.',
          '**Availability**: StrainUS aims for reasonable availability but does **not** warrant **uninterrupted** access. Access may be suspended for maintenance, updates, or **force majeure** under French law.',
          '**Your obligations**: use the service **lawfully** and fairly; do not infringe third-party rights; do not attack or disrupt the service or connected systems; do not abuse third-party systems for unlawful ends.',
          '**Intellectual property**: StrainUS retains rights in its **software**, text, and UI components. These terms **do not** grant a commercial licence.',
          '**Third-party links**: linked sites are **not controlled** by StrainUS; you use them at **your own risk**.',
          '**Personal data**: see the **privacy policy** below.',
          '**Not advice**: content is **not** investment, financial, tax, or legal advice.',
          '**Accuracy**: data comes from **third parties** and is **indicative**; no warranty of accuracy or completeness.',
          '**Limitation of liability**: to the extent **permitted by law**, StrainUS is **not liable** for **indirect** or consequential loss (including data loss, business loss, lost profit), including failures of **third parties** or **APIs**.',
          '**Force majeure**: StrainUS is not liable for failure caused by events beyond its reasonable control.',
          '**Changes**: StrainUS may **update** these terms; the **online version** when you browse prevails.',
          '**Governing law — disputes**: **French law** applies. Failing **amicable settlement**, **French courts** have jurisdiction, without prejudice to **mandatory** consumer or jurisdictional rules.',
          '**Severability**: if a clause is **invalid**, the **remainder** stays effective where allowed.',
        ],
      },
      {
        id: 'confidentialite',
        title: 'Privacy policy — personal data',
        tocLabel: 'Privacy',
        paragraphs: [
          '**Controller**: **StrainUS**, as identified in the **legal notice**, acts as **controller** for processing it carries out for this service. **Contact**: see the legal notice.',
          '**Nature of service**: **client-side** application in this repository; **no** mandatory account and **no** StrainUS application server here for user profiles.',
          '**Data, purposes, legal bases (GDPR transparency)**: (1) **Providing** the service: technical requests from your device to servers (hosting, APIs, RPC, etc.) — **legal bases**: **legitimate interests** in operating an information service and, where relevant, **performance** of pre-contractual/contractual measures; (2) **Preferences** (e.g. language) in **local storage** — **legal basis**: **consent** via your UI choice; withdraw by clearing site data in your browser.',
          '**Categories**: **technical** identifiers and logs that hosting or API providers may process under their policies; **local** preference data only.',
          '**Recipients**: **hosting** and other **providers**, and **third-party operators** called by the app, each under their own role and policy.',
          '**Transfers outside the EEA**: some providers (e.g. **US** hosting) may process data outside the EEA; where applicable, appropriate safeguards (e.g. **EU Standard Contractual Clauses**) may be used under **GDPR**.',
          '**Retention**: **local** data until you **clear** it; **third-party** retention per their rules.',
          '**Your rights**: under **GDPR** and French law, you may have rights of **access**, **rectification**, **erasure**, **restriction**, **objection**, **portability** (where applicable), and post-mortem instructions. Contact StrainUS via the **legal notice**. You may complain to the **CNIL**: [cnil.fr](https://www.cnil.fr).',
          '**Data Protection Officer (DPO)**: no DPO is named on this page unless StrainUS is **legally required** to appoint one; contact the **controller** as above.',
          '**Processors**: where StrainUS uses processors, it seeks **GDPR-appropriate** terms.',
          '**Security**: reasonable measures for a **front-end** service; **absolute** Internet security cannot be guaranteed.',
          '**Responsible disclosure**: report suspected **vulnerabilities** via **contact** in the **legal notice** or any **private** channel. **Do not** publicly post secrets, keys, sensitive data, or full exploit steps without prior agreement.',
          '**Updates**: this policy may be **updated**; the **published** version applies.',
        ],
      },
    ],
    reviewNote:
      '**Disclaimer**: this document aims at a **professional** level of disclosure for an online service published from **France**. It is **not a substitute** for counsel on your exact status, sector rules, appointed mediator, records of processing, or DPIA. StrainUS may revise it after **legal or DPO review**.',
  },
}
