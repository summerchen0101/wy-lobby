import type { LegalBlock, LegalSection } from './legalContentTypes'

export type {
  LegalBlock,
  LegalSection,
  LegalTableBlock,
} from './legalContentTypes'

export const PRIVACY_POLICY_TITLE = 'LUKLOK CASINO PRIVACY POLICY'
export const PRIVACY_POLICY_LAST_REVISED = 'Last Revised: July 16, 2026'

export const PRIVACY_POLICY_INTRO: LegalBlock[] = [
  {
    type: 'paragraph',
    text: 'This Privacy Policy of Veloraxy Interactive, Inc. ("Company", "we", "us", "our") describes how we collect, use, and disclose information about users of the Company\'s website www.LukLokCasino.com, the Company\'s applications ("App"), services, tools, and features (collectively, the "Services"). For the purposes of this Privacy Policy, "you" and "your" refer to you as the user of the Services.',
  },
  {
    type: 'paragraph',
    text: 'Please read this Privacy Policy carefully. By using, accessing, or downloading any of the Services, you agree to the collection, use, and disclosure of your information as described in this Privacy Policy. If you do not agree to this Privacy Policy, you may not use, access, or download any of the Services.',
  },
]

export const CCPA_TABLE_HEADERS = ['Category', 'Examples', 'Collected?']

export const CCPA_TABLE_ROWS: string[][] = [
  [
    'Identifiers',
    'A real name, alias, postal address, unique personal identifier, online identifier, Internet Protocol address, email address, account name, Social Security number, driver\'s license number, passport number, or other similar identifiers.',
    'YES',
  ],
  [
    'Personal Data categories listed in the California Customer Records statute (Cal. Civ. Code § 1798.80(e))',
    'Including but not limited to name, signature, social security number, physical characteristics or description, address, telephone number, passport number, driver\'s license or state identification card number, insurance policy number, education, employment, employment history, bank account number, credit card number, debit card number, or any other financial information, medical information, or health insurance information. Some Personal Data included in this category may overlap with other categories.',
    'YES',
  ],
  [
    'Protected classification characteristics under California or federal law',
    'Age (40 years or older), national origin, citizenship, marital status, sex (including gender, gender identity, gender expression, pregnancy or childbirth and related medical conditions), sexual orientation, veteran or military status, genetic information.',
    'NO',
  ],
  [
    'Commercial Information',
    'Records of personal property, products or services purchased, obtained, or considered, or other purchasing or consuming histories or tendencies.',
    'YES',
  ],
  [
    'Biometric Data',
    'An individual\'s physiological, biological, or behavioral characteristics that can be used singly or in combination with each other or with other identifying data, to establish individual identity. Facial recognition technology collects information from your image capture, including biometric data, and shares this information with us, which assists us in verifying your ID.',
    'YES',
  ],
  [
    'Internet or other similar network activity',
    'Browsing history, search history, information on a consumer\'s interaction with a website, application, or advertisement.',
    'YES',
  ],
  [
    'Geolocation Data',
    'Physical location or movements.',
    'YES',
  ],
  [
    'Audio/visual data',
    'Audio, electronic, visual, thermal, olfactory, or similar information.',
    'YES',
  ],
  [
    'Professional or employment-related information',
    'Current or past job history or performance evaluations.',
    'NO',
  ],
  [
    'Non-public education information (per the Family Educational Rights and Privacy Act (20 U.S.C. § 1232g, 34 C.F.R. Part 99))',
    'Education records directly related to a student maintained by an educational institution or party acting on its behalf, such as grades, transcripts, class lists, student schedules, student identification codes, student financial information, or student disciplinary records.',
    'NO',
  ],
  [
    'Inferences drawn from other Personal Data',
    'Profile reflecting a person\'s preferences, characteristics, predispositions, behavior, etc.',
    'YES',
  ],
]

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    id: 'updating',
    title: '1. UPDATING THIS PRIVACY POLICY',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may modify this Privacy Policy from time to time, in which case we will update the "Last Revised" date at the top of this Privacy Policy. Where we make material changes to the way in which we use information we collect, we will use reasonable efforts to notify you (for example, by emailing you at the last email address you provided to us, by posting notice of such changes on our website and/or the App, or by other means consistent with applicable law) and will take additional steps as required by applicable law. If you do not agree to any updates to this Privacy Policy, please do not access or continue to use the Services.',
      },
    ],
  },
  {
    id: 'collection',
    title: '2. OUR COLLECTION AND USE OF INFORMATION',
    blocks: [
      {
        type: 'paragraph',
        text: 'When you access or use the Services, we may collect certain categories of information about you from a variety of sources.',
      },
      {
        type: 'paragraph',
        text: 'This Privacy Policy covers our use of any information that can or could be used to identify you ("Personal Data"). It does not cover information which cannot be used to identify you ("Anonymous Data"). We need to collect and use certain Personal Data to provide the Services to you and to fulfill the promises we make to you in the Terms of Service.',
      },
      {
        type: 'paragraph',
        text: 'Certain features of the Services may require you to directly enter information about yourself. We provide you with choices regarding the collection, use, and sharing of your Personal Data. You may elect not to provide this information, but doing so may prevent you from using or accessing those features. Information that you directly submit through our Services may include:',
      },
      {
        type: 'paragraph',
        text: '1. Account and Registration. Users may access our App only if they register an Account with us. The Personal Data we collect as part of the Account creation process includes your first and last name, email, username, password, information to confirm you are old enough to use the Services and the App, and payment information for any in-app purchases or storage of funds in your account (for example, your name and the email associated with your payment account). We may also ask you or allow you to submit certain optional information, which may include updated usernames, preferences, and other profile information.',
      },
      {
        type: 'paragraph',
        text: '2. External Account Sign-On. You may be required to have an account with a supported external single sign-on service in order to use some of our Services. Where this is the case, the Personal Data we collect also depends on which external accounts you choose to use, their privacy policy, and what your privacy settings with those services allow us to see when you use their services to access our Services.',
      },
      {
        type: 'list',
        items: [
          'If you choose to link your Google account to the Services, we will collect your Google email address and an authentication token provided by Google.',
          'If you choose to link your Facebook account to the Services, we will collect a unique user ID provided by Facebook and, if permitted by you, your Facebook registered email address.',
          'If you choose to link your Apple account to the Services, we will collect your email address on file with your Apple ID account or a private relayed email address if you use the Hide My Email option provided by Apple.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Depending on the particular Service you sign up for, we may support additional external single sign-on services and collect additional Personal Data from them. Some external providers may notify you that they make additional information, such as your public profile, available to us when you use their single sign-on services. We do not collect this information from them.',
      },
      {
        type: 'paragraph',
        text: '3. Location of Your Device. We collect and use information about the location of your device as you use our Services. We need to know your location in order to operate the Services and to verify that you are accessing the Services from a permitted jurisdiction. We identify your location using a variety of technologies, including GPS, the WiFi points through which you are accessing the Services, and mobile/cell tower triangulation.',
      },
      {
        type: 'paragraph',
        text: 'We also collect and use your in-game or in-app actions and achievements, as well as certain information about your mobile device (including device identifiers, device OS, model, configuration, settings, and information about third-party applications or software installed on your device), to operate the Services for you and to personalize your gameplay and user experience. We will also generate an internal account ID when you use certain Services to associate you with an account.',
      },
      {
        type: 'paragraph',
        text: 'We further use the information above in order to provide technical and customer support to you.',
      },
      {
        type: 'paragraph',
        text: '4. Personal Data. When you interact with our Services (e.g., making purchases, subscribing, registering for events, entering sweepstakes, or communicating with us), we collect personal data such as your name, address, phone number, country, age, and email. This data is used to fulfill the Services and provide customer support.',
      },
      { type: 'subheading', text: 'Legitimate Interests' },
      {
        type: 'paragraph',
        text: 'We use your Personal Data for the following purposes based on legitimate interests:',
      },
      {
        type: 'list',
        items: [
          'Usage Data: Collecting IP address, browser type, operating system, visited pages, time spent, clicks, device and advertising identifiers, age, gender, in-app actions, settings, preferences, and purchases to understand user behavior and improve the Services.',
          'Communication: Using your email to provide technical and customer support.',
          'User Content: Associating your internal account ID and in-game username with any content you submit.',
          'Updates and News: Sending updates and news via email or in-app notifications (opt-out available).',
          'Personalized Offers: Analyzing in-game actions to show tailored rewards, promotions, or offers (opt-out available).',
          'Personalized Ads: Customizing ads based on your location and preferences (opt-out available).',
          'Social Features: Collecting and storing content you provide to enable social interactions within games (opt-out available).',
          'Service Improvement: Enhancing and adding new features to our Services.',
          'Sweepstakes Administration: Displaying in-game actions and profiles during sweepstakes promotions and related activities.',
          'Anti-Fraud Measures: Using device and in-app data to prevent fraud and cheating.',
          'Legal Compliance: Making necessary legal or regulatory disclosures.',
        ],
      },
      { type: 'subheading', text: 'Consent-Based Usage' },
      {
        type: 'paragraph',
        text: 'We will use your personal data for the following purposes only with your consent:',
      },
      {
        type: 'list',
        items: [
          'Background Activity Tracking: Collecting data for in-game items and rewards based on location (opt-out available).',
          'Facebook Integration: Importing friends list and profile information from Facebook (opt-out available).',
          'Contact Syncing: Syncing your device\'s address book to find contacts using our Services (opt-out available).',
          'Media Access: Accessing your device\'s media storage to upload content (opt-out available).',
          'Marketing: Sending marketing materials via email or in-app notifications (opt-out available).',
        ],
      },
      {
        type: 'paragraph',
        text: 'You can manage your preferences and opt-out options through your device or in-app settings.',
      },
      {
        type: 'paragraph',
        text: '5. Cookies. We also rely on your consent where we use cookies or similar technologies. Please see our Cookie Policy below for additional information about how we use them. Insofar as cookies collect Personal Data, we will process such data only based on your explicit consent, in anonymized form, or under a pseudonym.',
      },
      {
        type: 'paragraph',
        text: '6. Do Not Track. While you may disable the usage of cookies through your browser settings, we do not currently respond to a "Do Not Track" signal in the HTTP header from your browser or mobile application due to the lack of an industry standard on how to interpret that signal.',
      },
      {
        type: 'paragraph',
        text: '7. Prizes and Payments. We collect information to process prize winnings, administer payments, comply with the law (including requiring W-9 tax forms where necessary), and maintain records of prizes. Such information may include your email, full name, mailing address, Social Security or Taxpayer ID number, and other information necessary to complete tax reporting forms such as a 1099-MISC, as well as other relevant tax documentation.',
      },
      {
        type: 'paragraph',
        text: '8. Feedback. We collect and maintain records of customer service and other communications with users, including survey responses, questions or comments sent to us (including the nature of the request, name, and contact information), and other similar activities. This information may be used to enhance the Services or the App and to market to you or others.',
      },
      {
        type: 'paragraph',
        text: '9. Custom Content. We may use the information we collect automatically to tailor features and content to you, to market to you, to provide you with offers or promotions, to run analytics, and to better understand user interactions with the Services.',
      },
      {
        type: 'paragraph',
        text: '10. Outside Sources. We may obtain information about you from outside sources. Any information we receive from outside sources will be treated in accordance with this Privacy Policy. We are not responsible or liable for the accuracy of information provided to us by third parties, and we are not responsible for any third party\'s policies or practices.',
      },
      {
        type: 'paragraph',
        text: '11. Legal Requirements. In addition to the foregoing, we may use any of the above information to comply with any applicable legal obligations; to improve and develop the Services and our product offerings, including as we describe in our Terms of Service; to enforce any applicable terms of service; to protect or defend the Services, our rights, and the rights of our users or others; for the purpose of combatting fraud; and to otherwise operate our business. This Privacy Policy is integrated into and is expressly a part of the Terms of Service and is to be interpreted in conjunction with such Terms. Any capitalized term not defined herein shall have the meaning ascribed to it in the Terms of Service.',
      },
      {
        type: 'paragraph',
        text: '12. Biometric Verification. We may collect biometric information such as face prints or government ID scans through third-party facial recognition technology to verify user identities. This data helps prevent fraud and ensures compliance with "Know Your Customer" regulations. Biometric data is stored by our third-party providers per their policies and retained by us for up to three (3) years after your last interaction, or as required by law.',
      },
    ],
  },
  {
    id: 'account',
    title: '3. ACCOUNT INFORMATION',
    blocks: [
      {
        type: 'paragraph',
        text: 'If you would like to review or change the information in your account, or to terminate your account, you can log into your account settings and update your user account.',
      },
      {
        type: 'paragraph',
        text: 'Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with investigations, enforce our legal terms, and/or comply with applicable legal requirements.',
      },
    ],
  },
  {
    id: 'retention',
    title: '4. DATA RETENTION',
    blocks: [
      {
        type: 'paragraph',
        text: 'We retain your Personal Data only as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. Specific retention periods include:',
      },
      {
        type: 'list',
        items: [
          'Biometric data: 3 years after your last interaction, or as legally required;',
          'Transaction records: 7 years for tax and compliance purposes;',
          'Account data: until account deletion request, plus 90 days for fraud monitoring.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Anonymous Data may be retained indefinitely for analytics purposes.',
      },
    ],
  },
  {
    id: 'sharing',
    title: '5. PARTIES WE MAY SHARE YOUR INFORMATION WITH',
    blocks: [
      {
        type: 'paragraph',
        text: 'We will not share any Personal Data that we have collected from or about you except as described below.',
      },
      { type: 'subheading', text: 'Information Shared with Our Service Providers' },
      {
        type: 'paragraph',
        text: 'We engage external service providers to work with us to administer and provide the Services. As part of that arrangement, they will process your Personal Data on our behalf. These external service providers have access to your Personal Data only for the purpose of performing services on our behalf, in compliance with this Privacy Policy, and we ensure that each is contractually obligated not to disclose or use your Personal Data for any other purpose. The service providers we use help us to:',
      },
      {
        type: 'list',
        items: [
          'run, operate, and maintain our Services through third-party platform and software tools;',
          'perform content moderation and crash analytics;',
          'run email and mobile messaging campaigns;',
          'perform game, app, and marketing analytics;',
          'provide measurement services and target ads (you can opt out of these services at websites such as http://www.aboutads.info/choices and http://www.youronlinechoices.eu/);',
          'administer sweepstakes, promotions, and related activities, including registering players, verifying eligibility, and prize fulfillment;',
          'provide payment attribution;',
          'provide technical and customer support;',
          'process payments for in-app purchases; and',
          'provide identity verification using facial recognition technology (e.g., Sumsub Inc.). These providers process biometric data under contract and retain it per their privacy policies.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Some external service providers may also collect information directly from you (for example, a payment processor may request your billing and financial information) as a third-party service in accordance with their own privacy policy. Such external third-party service does not share your financial information, like credit card number, with us, but it may share limited information with us related to your purchase, such as your zip or postal code.',
      },
      { type: 'subheading', text: 'Information Shared with Other Players or Users' },
      {
        type: 'paragraph',
        text: 'When you use the Services, and particularly when you play our App or use social features within the App, we may share certain Personal Data with other players or users. This Personal Data includes your in-game or in-app profile (such as your username, your avatar, and your online status), your in-game or in-app actions and achievements, and your in-game messages and related content you share with other players or users. Additionally, certain Games or apps link to third-party sharing features on your device that you can use to disclose Personal Data to others outside the Services; we do not control and are not responsible for the practices of these third-party sharing features.',
      },
      { type: 'subheading', text: 'Information Shared Publicly' },
      {
        type: 'paragraph',
        text: 'When you use the Services, and particularly when you play our App or participate in any forum we may establish, the following information about you may be shared on web pages accessible to the public and therefore become publicly available: your username, in-game or in-app profile, achievements, and public messages.',
      },
      { type: 'subheading', text: 'Information Shared with Third Parties' },
      {
        type: 'paragraph',
        text: 'We share Anonymous Data with third parties for industry and market analysis. We may share Personal Data with our third-party publishing partners for their direct marketing purposes only if we have your express permission, which you can revoke at any time. We do not share Personal Data with any other third parties for their direct marketing purposes.',
      },
      { type: 'subheading', text: 'Information Disclosed for Our Protection and the Protection of Others' },
      {
        type: 'paragraph',
        text: 'We cooperate with government and law enforcement officials, and with private parties, to enforce and comply with the law. We only share information about you with government or law enforcement officials or private parties when we reasonably believe it necessary or appropriate: (a) to respond to claims or legal process (including subpoenas and warrants); (b) to protect our property, rights, and safety, and the property, rights, and safety of a third party or the public in general; or (c) to investigate and stop any activity that we consider illegal, unethical, or legally actionable.',
      },
      { type: 'subheading', text: 'Information Disclosed in Connection with Business Transactions' },
      {
        type: 'paragraph',
        text: 'Information that we collect from our users, including Personal Data, is a business asset. If we are acquired by a third party as a result of a transaction such as a merger, acquisition, or asset sale, or if our assets are acquired by a third party in the event we go out of business or enter bankruptcy, some or all of our assets, including your Personal Data, will be disclosed or transferred to a third-party acquirer in connection with the transaction.',
      },
      {
        type: 'paragraph',
        text: 'In certain circumstances, the Company may share your information with third parties for legitimate purposes, subject to this Privacy Policy. Such circumstances may include:',
      },
      {
        type: 'list',
        items: [
          'with vendors or other service providers, such as cloud storage providers, security vendors, data analytics vendors, banks, and payment processors;',
          'with our affiliates or otherwise within our corporate group;',
          'with third parties for marketing purposes, including sponsors of any promotions;',
          'when you request that we share certain information with third parties, such as through your use of social media widgets, login integrations, or interactions with other users on the platform;',
          'to comply with applicable law or any obligations thereunder, including cooperation with law enforcement, judicial orders, and regulatory inquiries;',
          'in connection with an asset sale, merger, bankruptcy, or other business transaction;',
          'to enforce our Terms of Service;',
          'to ensure the safety and security of the Company and/or its users; or',
          'with professional advisors, such as auditors, law firms, or accounting firms.',
        ],
      },
      { type: 'subheading', text: 'Communications and Opt-Out' },
      {
        type: 'paragraph',
        text: 'While we value our communications with you, if you do not wish to receive marketing communications from us or our representatives, you may opt out at any time by following the unsubscribe instructions included in our emails. Please note that this opt-out does not apply to operational or informational emails related to your account or other administrative purposes. You may continue to receive promotional email messages for a short period while we process your request.',
      },
      {
        type: 'paragraph',
        text: 'We do not share Personal Data with third parties for cross-context behavioral advertising. Any third-party advertising partners are contractually prohibited from combining our data with other information to track users across unrelated sites or services.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '6. COOKIES AND OTHER TRACKING TECHNOLOGIES',
    blocks: [
      { type: 'subheading', text: 'Cookies Policy' },
      { type: 'paragraph', text: 'Effective as of: July 16, 2026' },
      {
        type: 'paragraph',
        text: 'Our Services use cookies, which are small text files that are placed on your computer or device by a web server when you access our Services. We may place and access cookies and similar technologies on your computer or device, which are known as "first party cookies." Cookies may also be placed and accessed by third parties, which are known as "third party cookies" and are described below.',
      },
      {
        type: 'paragraph',
        text: 'We use cookies and local storage to monitor aggregate usage and web traffic of our Services, customize and improve our Services, help you navigate our Services, deliver content specific to your interests, and deliver advertisements to you.',
      },
      {
        type: 'paragraph',
        text: 'We also use "web beacons" (also known as web bugs, pixel tags, or clear GIFs), which are small graphics with a unique identifier that may be included on our Services, for example, to deliver or communicate with cookies, to track and measure the performance of our Services, to monitor how many visitors view our Services, and to monitor the effectiveness of our advertising. Unlike cookies, which are stored on a user\'s hard drive or device, web beacons are typically embedded invisibly on web pages (or in an email).',
      },
      {
        type: 'paragraph',
        text: 'A comprehensive list of cookies used, including their purposes, durations, and third-party operators, is available at [INSERT LINK]. You may manage cookie preferences via our Cookie Consent Manager at [INSERT LINK].',
      },
      { type: 'subheading', text: 'Types of Cookies' },
      {
        type: 'paragraph',
        text: 'We use the following types of cookies:',
      },
      {
        type: 'list',
        items: [
          'Strictly Necessary Cookies: Cookies that are essential to enable you to use the Services, for example, moving around our website and using its features (e.g., cookies that enable you to log into the Services).',
          'Performance Cookies: Cookies that collect information about how and when you and other visitors interact with our Services (e.g., pages viewed most often), and the information collected by these cookies is used to improve how our Services work.',
          'Functionality Cookies: Cookies that allow our Services to remember choices you have made (such as your login information) and provide you with content and features which are customized to you. For example, providing you with relevant content by using a cookie to remember which region you are in.',
          'Advertising Cookies: Cookies used to deliver advertisements to you which are more relevant to you and your interests. We may also share this type of information with third parties for these purposes.',
        ],
      },
      {
        type: 'paragraph',
        text: 'The types of cookies described above may be "session cookies" or "persistent cookies." Session cookies are only stored on your device while you are using the Services and are deleted when you log off from the Services or close your browser. Persistent cookies remain on your device for a period of time after you log off from the Services or close your browser.',
      },
      { type: 'subheading', text: 'Third Party Cookies' },
      {
        type: 'paragraph',
        text: 'Some cookies may be placed by third parties when you use the Services, as certain third-party service providers that we engage (including third-party advertisers) may place their own cookies on your hard drive or device. These cookies may provide information to those third parties about your browsing habits or may be used for security. Some also help to serve you with advertisements that are more relevant to you.',
      },
      { type: 'subheading', text: 'Google' },
      {
        type: 'paragraph',
        text: 'For example, our websites use Google Analytics, a web analytics service provided by Google, Inc. ("Google"). Google Analytics uses non-operational cookies, which are text files placed on your computer or device to help the website or app analyze how visitors use the website or app. The information generated by the cookie about your use of the website or app (including your IP address) will be transmitted to and stored by Google on servers in the United States. At our request, Google will use this information for the purpose of evaluating how the website or app is used, compiling reports on website/app activity for operators, and providing other services relating to website/app activity and internet usage. Google may also transfer this information to third parties where required to do so by law, or where such third parties process the information on Google\'s behalf.',
      },
      { type: 'subheading', text: 'Facebook' },
      {
        type: 'paragraph',
        text: 'Similarly, we use the Facebook pixel service. The Facebook pixel is an analytics tool that allows us to measure the effectiveness of our advertising by understanding the actions you take on other websites or apps. We use it to make sure our advertising on Facebook is shown to the right people and is effective. When you visit our website or app and take an action, this triggers the pixel, which reports the action to Facebook.',
      },
      {
        type: 'paragraph',
        text: 'By using our Services, you consent to the processing of data about you by Google and Facebook in the manner and for the purposes set out above.',
      },
      { type: 'subheading', text: 'Cookies Settings' },
      {
        type: 'paragraph',
        text: 'You may decline cookies that are not Strictly Necessary by clicking "Decline" in the cookie banner at the bottom of your screen. Additionally, although most browsers automatically accept cookies, you can change your browser options to stop automatically accepting cookies or to prompt you before accepting cookies. However, if you do not accept cookies, you may not be able to access all portions or features of the Services. If you continue to use the Services, you consent to our use of cookies as described in this Cookies Policy.',
      },
      { type: 'subheading', text: 'Do Not Track Signals' },
      {
        type: 'paragraph',
        text: 'Your browser settings may allow you to transmit a "Do Not Track" signal when you visit various websites. Like many websites, our website is not designed to respond to "Do Not Track" signals received from browsers. To learn more about "Do Not Track" signals, you can visit http://www.allaboutdnt.com/.',
      },
      { type: 'subheading', text: 'Cookies and Other Tracking Technologies' },
      {
        type: 'paragraph',
        text: 'Most browsers accept cookies automatically, but you may be able to control the way in which your devices permit the use of tracking technologies. If you so choose, you may block or delete our cookies from your browser; however, blocking or deleting cookies may cause some of the Services to work incorrectly or not function at all.',
      },
    ],
  },
  {
    id: 'third-party',
    title: '7. THIRD PARTY WEBSITES AND LINKS',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may provide links to third-party websites or other online platforms operated by third parties. If you follow these links to sites or interact with features (e.g., applications offered by third parties or social media widgets) not affiliated or controlled by us, you should review their privacy and security policies and other terms and conditions. We do not guarantee and are not responsible for the privacy, security, accuracy, completeness, or reliability of information found on these third-party sites. Information you provide on public or semi-public venues, including third-party social networking platforms like Facebook or X (formerly Twitter), may be viewable by other users without limitation on its use by us or third parties. Our inclusion of such links does not imply endorsement of the content, owners, or operators, except as disclosed. In using our Services, you may access third-party services owned or operated by others. Any information provided to a third-party service is subject to their privacy policy, not ours. We are not responsible for the content, privacy, or security practices of any third-party service. To protect your information, we recommend reviewing their policies.',
      },
      {
        type: 'paragraph',
        text: 'Because we do not control the privacy practices of third parties, you are subject to the privacy customs and policies of those third parties. We encourage you to review the privacy policies of any third-party services you choose to use in conjunction with our Services.',
      },
    ],
  },
  {
    id: 'children',
    title: '8. CHILDREN\'S PRIVACY',
    blocks: [
      {
        type: 'paragraph',
        text: 'Children are not allowed to use the Services, as our Services are expressly limited to adults over the age of majority. We do not seek or knowingly collect any Personal Data from children. If we become aware that we have unknowingly collected information about a child, we will make commercially reasonable efforts to delete such information from our database. If you believe that we have collected information about a child please contact us at support@LukLokCasino.com.',
      },
    ],
  },
  {
    id: 'use-of-services',
    title: '9. USE OF THE SERVICES',
    blocks: [
      {
        type: 'paragraph',
        text: 'By accessing and using the Services, you acknowledge and agree that the Services are intended for use by users located in the United States of America. Unless expressly stated to the contrary, we make no representation that the Services are appropriate or will be available for use in other locations.',
      },
    ],
  },
  {
    id: 'security',
    title: '10. DATA SECURITY',
    blocks: [
      {
        type: 'paragraph',
        text: 'Please be aware that, despite our reasonable efforts to protect your information, no security measures are perfect or impenetrable, and we cannot guarantee "perfect security." Please further note that any information you send to us electronically, while using the Services or otherwise interacting with us, may not be secure while in transit. We recommend that you do not use unsecure channels to communicate sensitive or confidential information to us. If you have any concerns about the security of your information, please contact us immediately using the information provided in the "Your Rights, Choices, and How to Contact Us" section of this policy.',
      },
    ],
  },
  {
    id: 'marketing',
    title: '11. YOUR CHOICES REGARDING MARKETING COMMUNICATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may send periodic informational emails to you. You may opt out of such communications by following the opt-out instructions contained in the email. If you opt out of receiving emails about recommendations or other information we think may interest you, we may still send you emails about any Services you have requested or received from us.',
      },
    ],
  },
  {
    id: 'state-laws',
    title: '12. STATE LAWS',
    blocks: [
      {
        type: 'paragraph',
        text: 'In addition to the existing rights to access, delete, and opt out of the sale or sharing of your personal information, you now have expanded rights under new state laws. These include the right to correct inaccurate personal information that we maintain about you. You may also have the right to limit the use and disclosure of your sensitive personal information, such as precise geolocation data, race, ethnicity, religious beliefs, sexual orientation, and specific health information. Furthermore, you may request to opt out of automated decision-making and profiling in certain circumstances. Depending on your state of residence, you may have the right to data portability, allowing you to obtain your personal information in a readily usable format. Some states also grant you the right to appeal a business\'s denial of your request to exercise these rights. The availability and scope of these rights may vary based on your location and applicable state laws.',
      },
    ],
  },
  {
    id: 'rights-contact',
    title: '13. HOW TO EXERCISE YOUR RIGHTS AND HOW TO CONTACT US',
    blocks: [
      {
        type: 'paragraph',
        text: 'You may exercise your rights under this Privacy Policy by reviewing the list of options below. We will respect the choices you make. Please note that if you decide not to provide us with the Personal Data that we request, you may not be able to access all of the features of the Services.',
      },
      {
        type: 'paragraph',
        text: 'To exercise your rights regarding your Personal Data, you can:',
      },
      {
        type: 'list',
        items: [
          'Request access to the Personal Data we hold on you by emailing support@LukLokCasino.com;',
          'Delete or correct your Personal Data. The easiest way to update your account information is via your in-app settings. You can also submit a customer support request through our support website or email us at support@LukLokCasino.com;',
          'Ask us to stop processing your Personal Data, including for direct marketing and promotional purposes such as tailored rewards, promotions, and other offers, by emailing support@LukLokCasino.com. Note, however, that sometimes we need to use your Personal Data in order to provide the Services to you.',
        ],
      },
      {
        type: 'paragraph',
        text: 'The law provides exceptions to these rights in certain circumstances. Where you cannot exercise one of these rights due to such an exception, we will explain to you why. Under the laws of certain states, you may appeal our decision in a consumers rights matter by emailing us at support@LukLokCasino.com with the subject heading: "CONSUMER RIGHTS REQUEST APPEAL."',
      },
      {
        type: 'paragraph',
        text: 'After you contact us, you may receive an email in order to verify your request. We aim to provide the information or complete the outcome you request within 30 days, or such shorter time period as provided by the laws of your jurisdiction.',
      },
      {
        type: 'paragraph',
        text: 'Should you have any questions about our privacy practices or this Privacy Policy, please email us at support@LukLokCasino.com or contact us at Veloraxy Interactive, Inc., 8 The Green, Suite A, Dover, DE 19901.',
      },
    ],
  },
  {
    id: 'california',
    title: '14. CALIFORNIA PRIVACY RIGHTS ADDENDUM',
    blocks: [
      {
        type: 'paragraph',
        text: '1. California Privacy Notice. This California Privacy Notice ("Notice") supplements our Privacy Policy. We have adopted this Notice to comply with the California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act of 2020 ("CCPA").',
      },
      {
        type: 'paragraph',
        text: '2. Information We Collect. We collect information that identifies, relates to, describes, references, is capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or device ("Personal Data"). The table below indicates whether we have collected certain types of Personal Data in the preceding 12 months:',
      },
      {
        type: 'table',
        headers: CCPA_TABLE_HEADERS,
        rows: CCPA_TABLE_ROWS,
      },
      {
        type: 'paragraph',
        text: '3. KYC – Know Your Customer. We may engage in KYC ("Know Your Customer") activities, which may include the processing of biometric information such as face prints, selfies, or government IDs. Additionally, we may collect and record user videos, photographs, and/or audio chats as part of our Services.',
      },
      {
        type: 'paragraph',
        text: '4. Personal Data Sources. We obtain the categories of Personal Data listed above from the following categories of sources:',
      },
      {
        type: 'list',
        items: [
          'Directly from our Users. For example, when Users register for our Services.',
          'Directly and indirectly from activity on our websites and applications. This includes usage and log information (for example, service-related, diagnostic, and performance information, including information about your activity on our websites and applications, log files, and reports) and device and connection information (we collect device-specific information such as hardware model, operating system information, browser information, IP address, etc.).',
          'From third parties that interact with us in connection with the Services we perform. We may work with third parties, for example, in order to understand, customize, support, and market the Services we provide and/or to comply with laws.',
        ],
      },
      {
        type: 'paragraph',
        text: '5. Use of Personal Data. We may use or disclose the Personal Data we collect for one or more of the following business purposes as disclosed in our Privacy Policy:',
      },
      {
        type: 'list',
        items: [
          'To provide and manage the Services you request;',
          'To improve customer service and our Services;',
          'To process payments;',
          'To personalize user experience;',
          'To contact you about our Services;',
          'To send important notices to you;',
          'To comply with our legal and regulatory obligations; or',
          'To offer alternative dispute resolution services.',
        ],
      },
      {
        type: 'paragraph',
        text: '6. Other Personal Data. We will not collect additional categories of Personal Data or use the Personal Data we collect for materially different, unrelated, or incompatible purposes without providing you notice.',
      },
      {
        type: 'paragraph',
        text: '7. Sharing Personal Data. We may disclose your Personal Data to a third party for business purposes. When we disclose Personal Data for a business purpose, we enter into a contract that describes the purpose and requires the recipient to keep that Personal Data confidential and not use it for any purpose except for performing the contract. We disclose your Personal Data for a business purpose to the following categories of third parties:',
      },
      {
        type: 'list',
        items: [
          'Our affiliates;',
          'Service providers; and',
          'Third parties that interact with us in connection with the Services we perform.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We do not sell your Personal Data. We do not use sensitive Personal Data for inferring characteristics beyond identity verification. You may limit use of sensitive data by contacting support@LukLokCasino.com.',
      },
      {
        type: 'paragraph',
        text: '8. Your Rights and Choices. The CCPA provides Users who are California residents with specific rights regarding their Personal Data.',
      },
      {
        type: 'list',
        items: [
          'Right to Know and Access Personal Data. You have the right to request the categories and specific pieces of Personal Data we have collected about you over the last 12 months.',
          'Right to Delete Personal Data. You have the right to request the deletion of your Personal Data, subject to certain exceptions.',
          'Right to Correct Inaccurate Personal Data. You have the right to request the correction of any inaccurate Personal Data that we maintain about you.',
          'Right to Limit Use and Disclosure of Sensitive Personal Data. We do not collect or process sensitive Personal Data for the purpose of inferring characteristics about you. We also do not disclose sensitive Personal Data for purposes other than those specified in Section 7027(m) of the California Privacy Rights Act regulations promulgated by the California Privacy Protection Agency. Therefore, we do not offer you the option to limit the use of your sensitive Personal Data.',
          'Right to Opt Out of Sale or Sharing. Under California law, consumers have the right to opt out of the sale or sharing of their Personal Data. Because we do not sell or share data for this purpose, we do not offer this opt-out.',
          'Right of Non-Discrimination. You have the right to exercise the privacy rights conferred to you under the CCPA without receiving discriminatory treatment. We do not discriminate against you for exercising the privacy rights conferred to you under the CCPA.',
        ],
      },
      {
        type: 'paragraph',
        text: '9. Exercising Access and Deletion Rights. To exercise the access and deletion rights described above, please submit a verifiable consumer request to us by contacting us as set forth below. Only you or may make a verifiable consumer request related to your Personal Data. If you decide to use an authorized agent, please also include written permission that you have designated that agent to make this request, or proof of the agent\'s power of attorney. We may follow up with you to verify your identity before processing your authorized agent\'s request. You may also make a verifiable consumer request on behalf of your minor child but note that we do not knowingly collect information from minors.',
      },
      {
        type: 'paragraph',
        text: 'In order for your consumer request to be verifiable, you must provide sufficient information that allows us to reasonably verify you are the person about whom we collected Personal Data, or an authorized representative. We may ask you to verify your account by making the request via your password-protected account. We may also require you to reauthenticate yourself before deleting, correcting, or disclosing your Personal Data.',
      },
      {
        type: 'paragraph',
        text: '10. Verifiable Consumer Request. We cannot respond to your request or provide you with Personal Data if we cannot verify your identity or authority to make the request, and confirm that the Personal Data relates to you. Making a verifiable consumer request does not require you to create an account with us. We will only use Personal Data provided in a verifiable consumer request to verify the requestor\'s identity or authority to make the request.',
      },
      {
        type: 'paragraph',
        text: '11. Response Timing and Format. We endeavor to respond to a verifiable consumer request within 45 days of receipt. If we require more time (up to 90 days), we will inform you of the reason and extension period in writing. If you have an account with us, we will deliver our written response to that account. If you do not have an account with us, we will deliver our written response by mail or electronically, at your option. Any disclosures we provide will only cover the 12-month period preceding receipt of the verifiable consumer request. The response we provide will also explain the reasons we cannot comply with a request, if applicable. For data portability requests, we will select a format to provide your Personal Data that is readily useable and should allow you to transmit the information from one entity to another entity without hindrance. We do not charge a fee to process or respond to your verifiable consumer request unless it is excessive, repetitive, or manifestly unfounded. If we determine that the request warrants a fee, we will tell you why we made that decision and provide you with a cost estimate before completing your request.',
      },
      {
        type: 'paragraph',
        text: '12. Your "Do Not Track" Browser Setting. Some web browsers incorporate a Do Not Track ("DNT") feature that signals to websites you visit that you do not want to have your online activity tracked. Our website may not respond to DNT signals. We may allow certain third-party advertising partners to place tracking technology, such as cookies and pixels, on our Services. This technology allows us and/or third parties to collect personally identifiable information about your online activities over time and across different websites.',
      },
      {
        type: 'paragraph',
        text: '13. No Discrimination Policy. We will not discriminate against you for exercising any of your CCPA rights.',
      },
      {
        type: 'paragraph',
        text: '14. Updates to Notice. This Notice may be updated from time to time to reflect changes in the Services or how the Services are regulated. We will notify you of changes by posting changes here, or by other appropriate means. Any Personal Data we collect is covered by the Privacy Policy in effect at the time the data is collected. You will be given reasonable notice of any material change.',
      },
      {
        type: 'paragraph',
        text: '15. California\'s "Shine the Light" law. California Civil Code Section § 1798.83 permits users of our Services that are California residents to request certain information regarding our disclosure of personal information to third parties for their direct marketing purposes. Note that we do NOT share personal information with third parties for this purpose.',
      },
    ],
  },
]
