import type { LegalBlock, LegalSection } from './legalContentTypes'

export const TERMS_OF_SERVICE_TITLE = 'LUKLOK CASINO TERMS OF SERVICE'
export const TERMS_OF_SERVICE_EFFECTIVE = 'Effective as of [EFFECTIVE DATE]'

export const TERMS_OF_SERVICE_INTRO: LegalBlock[] = [
  {
    type: 'paragraph',
    text: 'THE WEBSITE, PLATFORM, AND/OR GAMES DO NOT OFFER REAL MONEY GAMBLING, AND NO ACTUAL MONEY IS REQUIRED TO PLAY.',
  },
  {
    type: 'paragraph',
    text: 'These Terms and Conditions form a binding legal agreement between you and us and apply to your use of any of our Games or our Platform in any way, through any electronic device (web, mobile, tablet or any other device).',
  },
  {
    type: 'paragraph',
    text: 'NO PURCHASE OR PAYMENT IS REQUIRED TO PARTICIPATE IN THE LUKLOK CASINO SWEEPSTAKES. A PARTICIPANT\'S CHANCE OF WINNING WILL NOT BE INCREASED OR IMPROVED BY MAKING ANY PURCHASE OR PAYMENT OF ANY KIND OR AMOUNT.',
  },
  {
    type: 'paragraph',
    text: 'THIS AGREEMENT INCLUDES AN ARBITRATION PROVISION WHICH SETS FORTH HOW PAST, PENDING OR FUTURE DISPUTES BETWEEN YOU AND Veloraxy Interactive, Inc. SHALL BE RESOLVED BY FINAL AND BINDING ARBITRATION ON AN INDIVIDUAL BASIS ONLY AND FOR YOUR OWN LOSSES ONLY. SEE CLAUSE 17 FOR MORE INFORMATION.',
  },
]

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    id: 'definitions',
    title: '1. Definitions.',
    blocks: [
      { type: 'paragraph', text: 'For purposes of these Terms:' },
      { type: 'paragraph', text: '"Account" means any account created to access or use the Platform.' },
      {
        type: 'paragraph',
        text: '"Applicable Law" means all laws, regulations, rules, guidance, codes, orders, judgments, and regulatory requirements applicable to a party, the Platform, or any transaction.',
      },
      {
        type: 'paragraph',
        text: '"Restricted Jurisdiction" means the states of California, Connecticut, Idaho, Indiana, Iowa, Louisiana, Maine, Michigan, Mississippi, Montana, Nevada, New Jersey, New York, Oklahoma, Tennessee, and Washington in the United States, as well as any outlying U.S. territories or possessions, and any other jurisdiction outside of the United States.',
      },
      {
        type: 'paragraph',
        text: '"Game" means any one or more Game(s) available on the Platform in either Standard Play or Promotional Play. We reserve the right to add and/or remove Games from the Platform (including limiting their availability in certain jurisdictions) at our sole discretion for any reason.',
      },
      {
        type: 'paragraph',
        text: '"Gold Coin" means the virtual social gameplay token which enables you to play the Standard Play Games. Gold Coins have no monetary value and cannot under any circumstance be redeemed for prizes.',
      },
      { type: 'paragraph', text: '"Participate" means playing any Games or using our Platform in any manner whatsoever.' },
      {
        type: 'paragraph',
        text: '"Platform" means our website, mobile apps, software, interfaces, APIs, communications, customer support channels, social pages, promotions, services, and all related functionality.',
      },
      { type: 'paragraph', text: '"Player" or "you" means any person who Participates' },
      {
        type: 'paragraph',
        text: '"Promotional Play" means participation in our sweepstakes promotions by playing any games on the Platform with Sweeps Coins.',
      },
      {
        type: 'paragraph',
        text: '"Standard Play" means Participating in any Game on the Platform played with Gold Coins. We may give you Gold Coins free of charge when you sign up to a Platform and thereafter at regular intervals when you log into a Platform. You may win more Gold Coins when you play in Standard Play and you may purchase more Gold Coins on the Platform. You cannot win prizes when you Participate in Standard Play.',
      },
      {
        type: 'paragraph',
        text: '"Sweeps Coin" means the virtual token which permits entries to the sweepstakes games. We may give you Sweeps Coins free of charge when you sign up to a Platform, as a bonus when you purchase Gold Coins or via each of our free alternative methods of entry as set out in the Sweeps Rules. You may win more Sweeps Coins when you Participate in Promotional Play. YOU CANNOT PURCHASE SWEEPS COINS.',
      },
      { type: 'paragraph', text: '"Sweepstakes Rules" means the Sweeps Rules available on the Platform.' },
    ],
  },
  {
    id: 'general',
    title: '2. General.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. Binding Legal Agreement. These Terms of Service (the "Terms") form an enforceable legal agreement between you ("you" or "your") and Veloraxy Interactive, Inc. and its affiliates (which shall include subsidiaries, parent companies, joint ventures, and other corporate entities under common ownership) ("Company", "we," "us," or "our"). These Terms govern your use of any and all of our Games and the Platform (), together with the related websites, materials, applications, and services that we make available, collectively referred to in these Terms as the "Services." The Services are operated by us and provided to you for your personal, non-commercial use and entertainment only. Our Platform offers casino-style games of chance. The Platform features two entirely separate and independent game modes: Gold Coin social gaming, and free-to-play promotional sweeps gaming.',
      },
      {
        type: 'paragraph',
        text: '2. No Real Money Gambling. The Games and the Services do not involve real-money gambling. Our Games do not permit the deposit or withdrawal of any real money. Any in-game purchase of Gold Coins is entirely optional and grants you a license (subject to these Terms) to play the Gold Coin Games. No deposit of funds or purchase is required in order to play our Games. Your use of the Services (including, without limitation, accessing and using the Games) is subject to these Terms, including Section 16 ("Dispute Resolution"), as well as our Privacy Policy, Sweepstakes Rules, and Responsible Social Gameplay Policy (each of which is incorporated into these Terms), and all applicable laws.',
      },
      {
        type: 'paragraph',
        text: '3. Agreement. PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE CREATING AN ACCOUNT WITH US OR USING ANY OF OUR SERVICES. YOU ARE NOT PERMITTED TO USE ANY SERVICES, PLAY THE GAMES, OR CREATE AN ACCOUNT IF YOU DO NOT ACCEPT THESE TERMS (INCLUDING THE INTEGRATED POLICIES SET FORTH BELOW). BY CREATING AN ACCOUNT, USING ANY OF THE SERVICES, OR CLICKING "I ACCEPT," YOU AFFIRMATIVELY INDICATE THAT YOU:',
      },
      {
        type: 'list',
        items: [
          'READ AND ACCEPT THESE TERMS;',
          'AGREE TO BE BOUND BY THESE TERMS;',
          'AGREE TO OUR PRIVACY POLICY, SWEEPSTAKES RULES, AND RESPONSIBLE SOCIAL GAMEPLAY POLICY, WHICH ARE EXPRESSLY INTEGRATED INTO AND FORM A PART OF THESE TERMS; AND',
          'HAVE THE AUTHORITY AND ABILITY TO ACCEPT THESE TERMS.',
        ],
      },
      {
        type: 'paragraph',
        text: '4. Arbitration, Class Action Waiver, and Dispute Resolution. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, ANY CLAIM, DISPUTE, OR CONTROVERSY OF WHATEVER NATURE (A "CLAIM") ARISING OUT OF OR RELATING TO THESE TERMS AND/OR OUR GAMES OR ANY OTHER SERVICES MUST BE RESOLVED BY FINAL AND BINDING ARBITRATION IN ACCORDANCE WITH THE PROCESS DESCRIBED IN SECTION 16 BELOW. PLEASE READ SECTION 16 CAREFULLY. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, YOU ARE GIVING UP THE RIGHT TO LITIGATE (OR TO PARTICIPATE IN AS A PARTY OR CLASS MEMBER) ALL DISPUTES IN COURT BEFORE A JUDGE OR JURY.',
      },
      {
        type: 'paragraph',
        text: '5. Changes to these Terms. We reserve the right to change, revise, or otherwise modify these Terms at any time, with or without notice. We will endeavor to post any such changes on our website, but it remains solely your responsibility to review the Terms periodically, as they may change from time to time. Your continued use of the Services and the Games signifies your acceptance of, and agreement to be bound by, the revised Terms. We strongly recommend that you periodically review these Terms for changes.',
      },
      {
        type: 'paragraph',
        text: '6. Violation of these Terms. If you violate any of these Terms, or if we believe you have violated these Terms, we may terminate your Account with or without notice and/or limit or restrict your access to the Services. Taking any of the actions listed in this paragraph does not limit our ability to take any other action permitted by law or to pursue any other legal or equitable remedies that may be available, including, without limitation, damages and injunctive relief.',
      },
    ],
  },
  {
    id: 'eligibility',
    title: '3. Eligibility.',
    blocks: [
      {
        type: 'paragraph',
        text: 'To be eligible for an Account, to use our Services, and to play our Games, you must:',
      },
      {
        type: 'list',
        items: [
          'be a natural person who is at least 18 years of age (or higher if the age of majority in your jurisdiction is greater than 18), and who is personally assigned to the email address submitted during your Account creation;',
          'possess the power and ability to enter into a contract with us;',
          'not be physically located within a jurisdiction that prohibits the Services or the Games, or that otherwise prohibits or restricts you from accessing the Services and playing the Games (each, a "Restricted Jurisdiction"); and',
          'at all times comply with these Terms.',
        ],
      },
    ],
  },
  {
    id: 'representations',
    title: '4. Your Additional Representations to Us.',
    blocks: [
      {
        type: 'paragraph',
        text: 'In accepting these Terms, you represent, warrant, and certify that each of the following is true:',
      },
      {
        type: 'list',
        items: [
          'You are accessing our Services and participating in our Games strictly in your personal capacity, for recreational and entertainment purposes only;',
          'You are accessing our Services and participating in our Games on your own behalf, and not on behalf of any other person;',
          'All information you provide to us is true, complete, and correct, and you will promptly notify us in writing of any change to such information;',
          'You will not purchase Gold Coins from a business or corporate account, and instead will purchase only from a personal account held in your own personal name;',
          'Money that you use to purchase Gold Coins is not tainted with any illegality and, in particular, does not originate from any illegal activity or source, or from ill-gotten means;',
          'You are not, will not, and have no intention to be involved in any fraudulent or unlawful activity in connection with your or another person\'s participation in any of the Games, and you will not use any electronic-assisted methods or techniques (including but not limited to bots) or hardware devices in connection with your participation in any of the Games;',
          'You are making Gold Coin purchases only from an authorized payment method that belongs to you;',
          'You will not sell, trade, or exchange for value (or attempt to do so) your Account, Gold Coins, Sweeps Coins, or any other merchandise, Prize, or other thing of value that may be provided to you by us.',
        ],
      },
    ],
  },
  {
    id: 'integrated-policies',
    title: '5. Integrated Policies.',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms incorporate our Privacy Policy, Sweepstakes Rules, and Responsible Social Gameplay Policy (collectively, the "Integrated Policies") as if each were fully set forth herein.',
      },
    ],
  },
  {
    id: 'user-account',
    title: '6. User Account.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. You are allowed to have only one Account, including any Inactive Account, on the Platform. If you attempt to open more than one User Account, all accounts you have opened or try to open may be suspended or closed.',
      },
      {
        type: 'paragraph',
        text: '2. You must notify us immediately if you notice that you have more than one registered Account, whether active or not, on any one Platform. DO NOT CREATE A NEW CUSTOMER ACCOUNT IF YOU WISH TO CHANGE YOUR EMAIL, ADDRESS OR SURNAME.',
      },
      {
        type: 'paragraph',
        text: '3. Registration. To register for a User Account, you must provide a valid email address that you personally control. You will use your email to access the Games. Please ensure that you secure and retain control of the device on which you access the Games, as you are responsible for all activity associated with your Account. We reserve the right, in our sole discretion, with or without notice, to reject, change, suspend, modify, or terminate your Account and/or to block the email address associated with your Account.',
      },
      {
        type: 'paragraph',
        text: '4. Use of the Account. You are the holder of the Account and the sole person responsible for complying with these Terms. You are solely responsible for anything that happens through your Account, whether or not you undertook those actions. You are also the only person entitled to the benefits associated with using the Account. You are prohibited from allowing any other person to (i) access your Account, or (ii) use the Services through your Account. Your Account is not transferrable to any other person and may not be merged with any other account.',
      },
      {
        type: 'paragraph',
        text: '5. Updates to Payment Details. Updating or adding additional payment details for the sole purpose of redeeming a Prize may only be done by you while logged into your Account and when you are in the process of redeeming a prize from your Account (a "Prize"). We cannot update or add additional payment details on your behalf.',
      },
      {
        type: 'paragraph',
        text: '6. Accuracy. You are required to keep your registration details up to date at all times. If you change your address, email, phone number or any other contact details or personal information contact Customer Support at support@luklokcasino.com to update your details.',
      },
      {
        type: 'paragraph',
        text: '7. Security and Responsibility of Account. It is your sole and exclusive responsibility to ensure that your Account login details and any payment mediums are kept secure and are only accessible by you. You accept full responsibility for any unauthorized use of your Customer Account and any activity linked to your Customer Account, including by a minor (which in all events is prohibited). You must not share your Account or password with another person, let anyone else access or use your Account or do any other thing that may jeopardize the security of your Account.',
      },
      {
        type: 'paragraph',
        text: '8. Compromised Account. If you become aware of, or suspect, that the security of your Account has been compromised, including but not limited to any security breach, theft, or unauthorized disclosure of your password, or that anyone has accessed your Account details, you must notify us immediately.',
      },
      {
        type: 'paragraph',
        text: '9. Personal Location Data. As part of providing the Services, we may collect information about the location of the device you are using to access the Services. You may disable location access at any time on your device; however, certain Services may require us to verify the location of the user, and accordingly your access may be limited or denied if we are unable to verify your location.',
      },
      {
        type: 'paragraph',
        text: '10. Use of Information Collected. We may use the information you provide to us (including but not limited to your email address) to send you periodic promotional materials, special announcements, and other related communications. You will have the opportunity to opt out of these communications at any time.',
      },
      {
        type: 'paragraph',
        text: '11. Account Transfers. You may not transfer Gold Coins or Sweeps Coins between Accounts, or from your Account to other players, or to receive Gold Coins or Sweeps Coins from other Accounts into your Account, or to transfer, sell or acquire Accounts. Any attempt to circumvent these prohibitions is ground for immediate closure of your Account, without prejudice to any other rights or remedies available to us.',
      },
      {
        type: 'paragraph',
        text: '12. Closing of Accounts. If you wish to close your Account, you may do so at any time by selecting the "Contact Us" link on the Platform and submitting a request to close your Account. Closing your Account will forfeit all continued access to and right to use, enjoy or benefit from any Gold Coins, Sweeps Coins and unredeemed Prizes associated with your Account. All requests for the re-opening of an Account will be evaluated by our Customer Support and Compliance teams, who abide by strict customer protection guidelines.',
      },
    ],
  },
  {
    id: 'verification',
    title: '7. Verification Checks.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. You agree that we are entitled to conduct any identification, credit, and other verification checks that we may reasonably require, or that are required of us under applicable laws and regulations, by relevant regulatory authorities, or otherwise to prevent financial crime.',
      },
      {
        type: 'paragraph',
        text: '2. Until all required verification checks are completed to our sole and absolute satisfaction, any request you have made for redemption of Prizes will remain pending; and we are entitled to restrict your Account in any manner we may reasonably deem appropriate, including by suspending or closing your Account.',
      },
      {
        type: 'paragraph',
        text: '3. We will carry out additional verification procedures in accordance with our internal anti-financial-crime policies, including without limitation for any cumulative or single redemption of Prizes exceeding a value of $2,000.00.',
      },
      {
        type: 'paragraph',
        text: '4. Verification procedures may, for example, include requests for, and our examination of, copies of your (1) identification documentation (including photo identification) such as a passport; (2) proof of your address such as a utility bill; and (3) source-of-wealth or source-of-funds documentation such as a bank statement.',
      },
      {
        type: 'paragraph',
        text: '5. Where any identification, credit, or other verification check we require cannot be completed to our satisfaction because you have not provided a document we have requested in the form we require within 30 days of the date the document was first requested, we are under no obligation to continue with the verification check, and we may, in our sole discretion, close or otherwise restrict your Account in any manner we may reasonably deem appropriate.',
      },
      {
        type: 'paragraph',
        text: '6. We may engage third-party service providers to perform external identification and other verification checks on all players based on the information you provide to us from time to time.',
      },
    ],
  },
  {
    id: 'services-software',
    title: '8. Services, Games, and Related Software Updates and Availability.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. Services. We may at any time, with or without prior notice to you, (i) modify, suspend, or terminate your access to the Services (including the Games), without any liability to you and for any reason (or no reason) whatsoever; and (ii) interrupt access to the Services at any time and without liability for purposes of maintenance, repairs, and patching.',
      },
      {
        type: 'paragraph',
        text: '2. Software. To access the Games and use our Services, you may be required to download certain software and associated program interfaces, license keys, and patches (the "Software") onto your device. By downloading the Software, you agree and understand that periodic updates may be necessary, and that if you do not allow access for the purposes of those updates, the Software may no longer be usable and you may no longer be able to access the Games.',
      },
      {
        type: 'paragraph',
        text: '3. Changes. We reserve the right to suspend, modify, remove, or add Games or other content to the Services at our sole discretion, with immediate effect and without notice to you. We will not be liable to you for any loss suffered as a result of any changes made, or for any modification, suspension, or discontinuance of the Services (including any Games), and you understand and agree that you have no claims against us in such regard.',
      },
      {
        type: 'paragraph',
        text: '4. Malfunctions. We are not liable for any downtime, server disruptions, lagging, or any technical or political disturbance to Game play, nor attempts by you to Participate by methods, means or ways not intended by us. We accept no liability for any damages or losses which are deemed or alleged to have arisen out of or in connection with any Platform or its Content including, without limitation, delays or interruptions in operation or transmission, loss or corruption of data, communication or lines failure, any person\'s misuse of a Platform or its Content or any errors or omissions in Content. In the event of a Platform system malfunction all Game play on that Platform is void. In the event a Game is started but fails to conclude because of a failure of the system, we will use commercially reasonable efforts to reinstate the amount of Gold Coins or Sweeps Coins played (whichever applicable) in the Game to you by adding them to your Customer Account. We reserves the right to alter Player balances and account details to correct such mistakes.',
      },
      {
        type: 'paragraph',
        text: '5. Territorial Availability. The Platform, or any feature thereof (including any and all Games, promotions, and content), may not be available in all territories and jurisdictions and we makes no representation that the Platform is or shall remain available for use in any particular territories and jurisdictions. You acknowledge and agree that we may (at our sole discretion) change, restrict or prohibit the availability of all or a portion of the Platform in certain territories and jurisdictions at any time, and you will have no claims against us in such regard.',
      },
    ],
  },
  {
    id: 'games-features',
    title: '9. The Games and Features.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. Description and Nature of the Games. Our Platform offers casino-style games of chance. Within the Platform, players may play in one of two separate and independent Game modes: Standard Play using Gold Coins or Promotional Play using Sweeps Coins. Our games (the "Games") are for individual entertainment purposes only and do not allow a player to win any money, Prize, or other thing of value. No purchase is necessary to play any of our Games. Upon registering for an Account, you receive a periodic allotment of virtual tokens called Gold Coins, which you may use to play the Standard Play Games. Each of the Games has its own rules, and it is your responsibility to read and understand those rules before playing. The Standard Play Games reward successful play with Gold Coins only, which may only be used to play the Games. Gold Coins may not be exchanged for anything of value and may not be traded, redeemed, or exchanged for Sweeps Coins.',
      },
      {
        type: 'paragraph',
        text: '2. Purchases. We offer you the opportunity to purchase additional Gold Coins for entertainment purposes. Gold Coins are available to you free of charge through periodic distributions, and through our automatic refill mechanism, which provides additional Gold Coins when your balance reaches a certain minimum amount. Purchasing Gold Coins is strictly voluntary and is not required to access any of the Games. If you are in a Restricted Jurisdiction, you may not purchase Gold Coins, and any attempt to do so is a violation of these Terms.',
      },
      {
        type: 'paragraph',
        text: 'The payment method you use to purchase Gold Coins must be legally and beneficially owned by you and in your name. If it comes to our attention that the name you registered on your Account and the name linked to your payment method differ, your Account will be immediately suspended. We reserve the right to request documents and information to verify the legal and beneficial ownership of the payment method you use to make Gold Coin purchases.',
      },
      { type: 'subheading', text: 'Free Refill Mechanism' },
      {
        type: 'paragraph',
        text: 'We may offer an on-demand free refill mechanism for Gold Coins.',
      },
      {
        type: 'list',
        items: [
          'Players who run out of Gold Coins will be presented with a pop-up window featuring a free refill option.',
          'The free refill option requires the Player to complete a brief form and a Captcha (to protect against automation, bots, hacking, and fraud).',
          'Once verification is completed, the Player\'s account will be credited with at least 100 Gold Coins.',
        ],
      },
      {
        type: 'paragraph',
        text: '5. Sweeps Coins Awards and Distributions. We may periodically and free of charge distribute to you or gift you with Sweeps Coins. You may not purchase Sweeps Coins in any manner. Sweeps Coins are equivalent to sweepstakes entries and are governed by our Sweepstakes Rules. You may receive Sweeps Coins free of charge upon signing up for an Account, as a free bonus when you purchase Gold Coins, or via each of our free alternative methods of entry pursuant to the Sweepstakes Rules. You may win additional Sweeps Coins when you play our separate and special Promotional Play Games IMPORTANT: Any attempt by you to buy, sell, trade for, or otherwise obtain or distribute Sweeps Coins other than through our free methods is an express violation of these Terms and may constitute a violation of applicable law.',
      },
      {
        type: 'paragraph',
        text: '6. No Refunds. All Gold Coin purchases are final and non-refundable for any reason whatsoever, unless otherwise required by law. By purchasing Gold Coins, you are paying for a license to use those Gold Coins in connection with our Games, and you understand and agree that they are not property of any kind and cannot be redeemed for any money or anything else of tangible value.',
      },
      {
        type: 'paragraph',
        text: '7. Void Games and Final Decision. We reserve the full and absolute right to void any Games participation or result if we determine, in our sole discretion, that there was a malfunction, mistake, error, or otherwise improper operation of the Games.',
      },
      { type: 'subheading', text: 'Prize Redemption' },
      {
        type: 'paragraph',
        text: 'Any Prize redemption feature is strictly limited to Sweeps Coins and is subject to the specific provisions of the Sweepstakes Rules. We reserve the right to set Sweeps Coins Prize minimums and to charge processing fees. We process requests to redeem Prizes in the order in which they are received. Our goal is to process your request as soon as practicable.',
      },
      {
        type: 'list',
        items: [
          'Residents of Florida may not receive any Prizes with an aggregate value equal to or in excess of $5,000.00. Any potential Prizes in excess of that amount will automatically be reduced to $5,000.00.',
          'Regardless of jurisdiction, we reserve the right to limit you to a maximum daily Prize that does not exceed $10,000.00, and you are limited to one Prize redemption request per 24-hour period.',
          'When you choose to redeem a Prize, you agree to comply with our verification requirements, including providing accurate identifying information, an email address, or bank account information, as may be requested. Failure to comply with all applicable requirements will result in your forfeiture of the Prize.',
          'If you choose to redeem a Prize for cash, the cash payment will be made to the payment method from which you purchased Gold Coins, or, if that is not technically possible, to an alternative financial account you nominate, provided that account is legally and beneficially owned by you. We reserve the right to require the use of the same payment method for redemption of Prizes as was used to purchase Gold Coins, or a specific payment method designated by us at our own discretion.',
          'Prior to making any payment or redeeming any Prize, we will carry out additional verification procedures in accordance with our internal anti-financial-crime policies, including without limitation for any cumulative or single redemption of Prizes exceeding a value of $2,000.00. We retain the sole discretion to determine whether the verification and any documents you have provided comply with our policies, and we reserve the right to delay payment until such verification and due diligence are completed to our satisfaction.',
        ],
      },
      {
        type: 'paragraph',
        text: '9. Tax Responsibility. You are solely responsible for the payment of any taxes associated with Prizes or activities related to our Services. We may request information from you that is necessary to report your Prizes to the relevant government authorities, and you agree to provide such information to us promptly.',
      },
      { type: 'subheading', text: 'Coin Purchase and Balance Requirements' },
      {
        type: 'paragraph',
        text: 'You may participate in any Game only if you have sufficient Gold Coins or Sweeps Coins for the appropriate game in your Account. Under no circumstances will we extend credit to you for the purchase of anything related to our Services, including Gold Coins.',
      },
      {
        type: 'list',
        items: [
          'We may set a minimum or maximum Gold Coin purchase amount as specified and offered as part of our Services.',
          'Once you make a Gold Coin purchase, the purchase price will be drawn from your specified payment method as soon as practicable.',
          'The purchase of Gold Coins is the purchase of a license that allows you to participate in Standard Play Games and is not the deposit of funds that may be withdrawn. Funds used to purchase Gold Coins will not be refunded under any circumstances, unless otherwise required by law.',
          'Gold Coins do not have any real money value.',
          'Gold Coins or Sweeps Coins that have been submitted for play and accepted cannot be changed, withdrawn, or cancelled, and the Gold Coins or Sweeps Coins will be deducted from your applicable balance instantly.',
          'Any attempt to chargeback, dispute, or reverse any transaction with us will result in your Account being suspended. If this occurs, the amount of such purchases will constitute a debt owed by you to us, and you must immediately remit payment for such purchases through an alternative payment method. Until payment is received by us or our payment administration agent or agents, any purchases and Prizes will be deemed void, and all Prize redemption activities or attempts shall be void.',
          'As set forth in the Sweepstakes Rules, unless we require otherwise, any Sweeps Coins allocated to you are required to be played once before they are eligible to be redeemed for a Prize; and we may, in our sole discretion, require that any Sweeps Coins allocated to you be played through additional times in any combination of potential promotional games before becoming eligible for Prize redemption.',
        ],
      },
      { type: 'subheading', text: 'Promotions' },
      {
        type: 'paragraph',
        text: 'All promotions, including any Games played in promotional or bonus play, contests, special offers, and other bonuses are subject to these Terms, the Sweepstakes Rules, and to any additional terms that may be published at the time of the promotion.',
      },
      {
        type: 'list',
        items: [
          'In the event of any conflict (and to the extent of such conflict) between these Terms and any promotion-specific terms and conditions, the promotion-specific terms and conditions will control.',
          'We reserve the right, at our sole discretion, to withdraw or modify any such promotion without prior notice to you.',
          'If we suspect or determine that you are abusing any promotion in order to derive any advantage or gain, whether for yourself or another person, we may, at our sole discretion, withhold, deny, or cancel any promotion, bonus, or Prize as we see fit, and take any other actions, including suspending or closing your Account.',
          'Without limitation, you hereby grant us an irrevocable, perpetual, worldwide, non-exclusive, royalty-free license to use, in any way we see fit and without further acknowledgement of you as the author, any content you post or publish as part of a promotion, contest, or competition associated with our Services.',
        ],
      },
      { type: 'subheading', text: 'Your Responsibility for Prize Redemptions and Details' },
      {
        type: 'paragraph',
        text: 'If you choose to redeem a Prize for a cash payment, it is your sole responsibility to ensure that your financial institution will accept payment from us into your designated bank account. We have no obligation to check whether your financial institution will accept payments from us into your designated bank account.',
      },
      {
        type: 'paragraph',
        text: 'We will not make payments into an account or online wallet that does not match your verified name or the name you provided when registering your Account, or that is not legally and beneficially owned by you, or that is otherwise different from the name on documents you provide to us as part of any verification process or procedure.',
      },
      {
        type: 'paragraph',
        text: 'If you choose to redeem a Prize for cash:',
      },
      {
        type: 'list',
        items: [
          'The Prize amount will be paid into a joint account or joint wallet provided that one of the names on the joint account or joint wallet matches the name you provided when registering your Account or your verified name, and all verification checks we require in relation to you and the other account holder are completed to our satisfaction. For the avoidance of doubt, if either joint account holder does not satisfy our verification requirements, as determined solely at our discretion, we will not make payments into the designated joint account;',
          'The Prize amount will not be paid into: a joint account or joint wallet where one of the joint owners is a minor; custodial accounts; or any account held in trust for, or for the benefit of, a third party (including a minor).',
        ],
      },
      {
        type: 'paragraph',
        text: 'Where you are required to provide the details of your financial institution, bank account, or online wallet, you agree that you are solely responsible for the accuracy of those details. You further agree that, where you have chosen to redeem a Prize for cash and the details you have provided are not accurate, and we have processed the redemption using those details, the redemption of that Prize is deemed complete, and we are not required to reissue any Prize or gift cards, refund your Account, or otherwise give you credit for any Prize amount.',
      },
      {
        type: 'paragraph',
        text: 'You acknowledge and agree that if your financial institution will not accept payments from us, or where your bank account or online wallet does not meet the requirements in these Terms:',
      },
      {
        type: 'list',
        items: [
          'you will be required to designate an alternative bank account for the payment;',
          'there may be delays in the processing of the payment to you; and',
          'if you are unable to designate an alternative bank account meeting the requirements of these Terms within sixty (60) days of a request from us to do so, we may deem the Prize redemption void and abandoned, without any obligation to refund, credit, or otherwise redeem your Prizes.',
        ],
      },
      {
        type: 'paragraph',
        text: '13. Currency. All Gold Coin purchases and direct bank transfer payments are executed in USD (United States Dollars). It is your responsibility to ensure that your designated bank account can accept transactions in USD. All foreign exchange transaction fees, charges, or related costs you may incur as a result of, or in relation to, payments made by us to you are your sole responsibility, including but not limited to any losses or additional costs arising from foreign exchange transaction rates or exchange rate fluctuations.',
      },
      {
        type: 'paragraph',
        text: '14. Refused Prizes. If you choose to redeem a Prize for cash, but refuse to accept payments made to your designated bank account by us, you must refuse the amount in its entirety. Where you refuse to accept payment to your designated bank account more than twice in any 3-month period, we reserve the right to suspend your Account for the purposes of investigation to ensure that our Services are not being used for any fraudulent or otherwise illegal activity.',
      },
      {
        type: 'paragraph',
        text: '15. Mistake. If we mistakenly credit your Account with Prizes that do not belong to you or that you did not otherwise win, whether due to a technical error, human error, or otherwise, the amount credited will remain our property and will be deducted from your Account. If you have been transferred cash or gift cards that do not belong to you before we become aware of the error, the mistakenly paid amount will (without limitation to other remedies and actions that may be available to us at law) constitute a debt owed by you to us. If you discover an incorrect payment, credit, or other mistake in your Account, you must notify us immediately in writing by contacting Customer Support.',
      },
      {
        type: 'paragraph',
        text: '16. Inactive Accounts. An account shall be deemed inactive if you have not logged on within the preceding 60 days. All Sweeps Coins in an inactive account shall be forfeited. We reserve the right and discretion to disable access to any inactive account, to close such account, and to limit the right of the associated user to open any new or additional accounts.',
      },
      {
        type: 'paragraph',
        text: '17. Other Restrictions on Use. You may not use, copy, reproduce, or redistribute the Services, Software, or Games or any related or derivative products or services without our express written permission. You may not engage in, or assist others to engage in, conduct that would damage or impair our property, including, without limitation: (i) copying, distributing, transmitting, displaying, performing, framing, linking, hosting, caching, reproducing, publishing, licensing, or creating derivative works from any information, software, products, or services obtained from us; (ii) providing unauthorized means through which others may use the Services, such as through server emulators or IP spoofing programs; (iii) taking actions that impose an unreasonable or disproportionately large load on network infrastructure, or that could damage, disable, overburden, or impair our Services or Games; (iv) interfering with any other party\'s use and enjoyment of the Services and/or Games; and/or (v) attempting to gain unauthorized access to third-party accounts, the Services, or the Games.',
      },
      { type: 'subheading', text: 'Other Improper Conduct' },
      {
        type: 'paragraph',
        text: 'In addition to the above, conduct that will be deemed improper also includes, but is not limited to:',
      },
      {
        type: 'list',
        items: [
          'any violation of the Sweepstakes Rules or these Terms;',
          'using automated means (including but not limited to scripts and third-party tools) to interact with our Services or Games in any way;',
          'using automated means (including but not limited to harvesting bots, robots, parsers, spiders, or screen scrapers) to obtain, collect, or access any information from our Services or Games or from other players;',
          'obtaining other players\' information and spamming other players;',
          'interfering in any way with other players\' use of the Games;',
          'engaging in any illegal or unlawful conduct;',
          'abusing or misusing our Services, Software, or Games in any way;',
        ],
      },
      {
        type: 'paragraph',
        text: 'and other fraudulent conduct ("Fraudulent Conduct"), which includes, directly or indirectly:',
      },
      {
        type: 'list',
        items: [
          'hacking into any part of the Games or Services through password mining, phishing, or any other means;',
          'attempting to modify, reverse engineer, or reverse-assemble any part of the Games or Services;',
          'knowingly introducing viruses, Trojans, worms, logic bombs, spyware, malware, or other similar material;',
          'circumventing the structure, presentation, or navigational function of any Game so as to obtain information that we have chosen not to make publicly available as part of the Services;',
          'engaging in any form of cheating or collusion;',
          'using the Services to facilitate any type of illegal money transfer (including money laundering proceeds of crime); or',
          'participating in or taking advantage of (or encouraging others to do so) schemes, organizations, agreements, or groups designed to share: (1) special offers or packages emailed to a specific set of users and redeemable by URL, or (2) identification documents (including but not limited to photographs, bills, and lease documents) for the purpose of misleading us as to a user\'s or player\'s identity.',
        ],
      },
      {
        type: 'paragraph',
        text: '19. Other Restrictions. You must not use the Services for any unlawful or fraudulent activity or prohibited transactions (including Fraudulent Conduct) under the laws of any jurisdiction that apply to you. We monitor all transactions in order to prevent money laundering and other illegal activity. If we suspect that you may be engaging in, or have engaged in, fraudulent, unlawful, or improper activity, including money laundering activities or any conduct that violates these Terms or any applicable laws, your access to the Services will be suspended immediately, and your Account may be suspended or closed. If your Account is suspended or closed under such circumstances, we are under no obligation to reverse any Gold Coins purchases you may have made or to credit your account with any Sweeps Coins or other Prizes. In addition, we may pass any relevant information on to the proper law enforcement and government authorities, other online service providers, banks, credit card companies, electronic payment providers, or other financial institutions. You agree that you will cooperate fully with us in any investigation. If you suspect any unlawful or fraudulent activity or prohibited transaction by another user, player, or person, please notify us immediately in writing by contacting Customer Support.',
      },
      {
        type: 'paragraph',
        text: '20. No Limitation on Remedies. Players further acknowledge that the closure or suspension of your Account shall in no way prevent us from pursuing criminal or civil proceedings in connection with your misconduct.',
      },
    ],
  },
  {
    id: 'account-closure',
    title: '10. Closure/Suspension of Account',
    blocks: [
      {
        type: 'paragraph',
        text: '1. We reserve the right, at our sole discretion, to suspend or close your Account (notwithstanding any other provision contained in these Terms and Conditions) where we have reason to believe that you have engaged or are likely to engage in any of the following activities:',
      },
      {
        type: 'list',
        items: [
          'you breached, or assisted another party to breach, any provision of these Terms and Conditions or the Sweepstakes Rules, or we have a reasonable ground to suspect such breach;',
          'you have more than one Account, including any Inactive Account, on any Platform;',
          'the name registered on your Account does not match the name on (i) your payment method used to make purchases of Gold Coins or (ii) the account into which you elect to redeem Prizes or you do not legally and beneficially own such Payment Medium or redemption account;',
          'your communication with us consists of harassment or offensive behavior, including (but not limited to) threatening, derogatory, abusive or defamatory statements, or racist, sexually explicit, pornographic, obscene or offensive language;',
          'your Customer Account is deemed to be Inactive;',
          'you become bankrupt;',
          'you provide incorrect or misleading information;',
          'your identity or source of funds (if requested) cannot be verified;',
          'you attempt to use your Account through a VPN, proxy or similar service that masks or manipulates the identification of your real location, or by otherwise providing false or misleading information regarding your citizenship, location or place of residence, or by playing Games using the Platform through a third party or on behalf of a third party;',
          'you are not over 18 years of age or such higher minimum legal age of majority as stipulated in the jurisdiction of your residence;',
          'you are located in a jurisdiction where: (1) Participation is illegal; or (2) where you are ineligible to Participate in Promotional Play in accordance with the Sweeps Rules.',
          'you have allowed or permitted (whether intentionally or unintentionally) someone else to Participate using your Account;',
          'you have played in tandem with other Player(s) as part of a club, group, etc., or played the Games in a coordinated manner with other Player(s) involving the same (or materially the same) selections;',
          'you have failed our due diligence procedures, or are found to be colluding, cheating, money laundering or undertaking any kind of fraudulent activity;',
          'it is determined by us that you u have employed or made use of a system (including machines, computers, software or other automated systems such as bots) which give you an unfair advantage.',
        ],
      },
      {
        type: 'paragraph',
        text: '2. If we suspend or close your Account for any of the reasons referred to in this clause, you will be liable for any and all claims, losses, liabilities, damages, costs and expenses incurred or suffered by us arising therefrom and you will indemnify and hold us harmless on demand for such Claims.',
      },
      {
        type: 'paragraph',
        text: '3. If we have reasonable grounds to believe that you have participated in any of the activities set out in in this clause then we reserve the right to withhold all or part of the balance or recover from your Account any Prizes, Gold Coins or Sweeps Coins that are attributable to any of the activities contemplated by the clause.. In such circumstances, your details may be passed on to any applicable regulatory authority, regulatory body or any other relevant external third parties.',
      },
      {
        type: 'paragraph',
        text: '4. The rights set out in clause 10 are without prejudice to any other rights that we may have against you under these Terms and Conditions or under applicable principles of law or equity.',
      },
    ],
  },
  {
    id: 'waiver-indemnification',
    title: '11. Waiver and Indemnification on Playing the Games.',
    blocks: [
      {
        type: 'paragraph',
        text: 'By registering for an Account, playing our Games, and using our Services, you agree to indemnify, release, and hold us harmless, as well as our affiliates, agents, officers, directors, employees, shareholders, attorneys, vendors, third party suppliers, and any of their representatives (collectively, the "Released Parties"), from any and all liability, claims, or actions of any kind whatsoever, including but not limited to injuries, damages, or losses to persons and property that may be sustained in connection with the use of our Games and Services, as well as any claims based on publicity rights, defamation, or invasion of privacy. We are not responsible for: any incorrect, invalid, or inaccurate entry information; human errors; postal delays / postage due mail; technical malfunctions; failures, including public utility or telephone outages; omissions, interruptions, deletions, or defects of any telephone system or network, computer online systems, data, computer equipment, servers, providers, or software, including without limitation any injury or damage to any entrant\'s or any other person\'s computer or video equipment relating to or resulting from use of our Games; inability to access our Games or any related Services; theft, tampering, destruction, or unauthorized access to, or alteration of, entries and/or images of any kind; data that is processed late or incorrectly, or that is incomplete or lost due to telephone, postal issues, computer or electronic malfunction or traffic congestion on telephone lines or transmission systems, or the Internet, or any service provider\'s facilities, or any phone site or website, or for any other reason whatsoever; or typographical, printing, or other errors, or any combination thereof.',
      },
    ],
  },
  {
    id: 'hacking',
    title: '12. Hacking.',
    blocks: [
      {
        type: 'paragraph',
        text: 'ANY ATTEMPT BY YOU OR ANY OTHER INDIVIDUAL TO DELIBERATELY DAMAGE OUR SERVICES OR UNDERMINE THE LEGITIMATE OPERATION OF THE GAMES IS A VIOLATION OF CRIMINAL AND/OR CIVIL LAW, AND SHOULD ANY SUCH ATTEMPT BE MADE, WE RESERVE THE RIGHT TO SEEK DAMAGES AND OTHER REMEDIES FROM ANY SUCH PERSON TO THE FULLEST EXTENT PERMITTED BY LAW.',
      },
    ],
  },
  {
    id: 'viruses',
    title: '13. Viruses.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Although we take all reasonable measures to ensure that the Services are free from viruses (and similar malicious software), we cannot and do not guarantee that the Services are free of such problems. It is your responsibility to protect your systems and to have in place the ability to reinstall any data or programs lost due to a virus or other malicious software or activity.',
      },
    ],
  },
  {
    id: 'legal-compliance',
    title: '14. Legal and Regulatory Compliance.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. Compliance With Laws. It is your sole responsibility to determine whether there are any laws that prohibit or restrict your ability to access the Services or to use the Games ("Applicable Laws"). Without limiting the foregoing, the Sweepstakes Games are not available to residents of the States of California, Connecticut, Idaho, Indiana, Iowa, Louisiana, Maine, Michigan, Mississippi, Montana, Nevada, New Jersey, New York, Oklahoma, Tennessee, and Washington. Please see our Sweepstakes Rules for additional information.',
      },
      {
        type: 'paragraph',
        text: '2. Your Warranties. Without limiting any of your other responsibilities and representations made as part of accepting these Terms, in consideration of accessing and/or using the Services (including the Games), you represent and warrant that: (i) you have the right, capacity, and authority to agree to and be bound by these Terms, to register for an Account, and to use the Games; (ii) you will comply with these Terms; (iii) all of the information you provide to us is accurate and complete to the best of your knowledge, and you will promptly notify us in writing of any inaccuracies or incompleteness; and (iv) you are located in a jurisdiction (whether state, territory, or country) where it is not unlawful for you to access the Games or the Services, and you may otherwise use the Services and the Games without violating any applicable federal, state, local, or other law or administrative regulation.',
      },
      {
        type: 'paragraph',
        text: '3. No Illegal Use. You agree that you will not engage in, attempt to engage in, or assist others in engaging in any illegal or unlawful conduct related to or utilizing the Services or the Games, including but not limited to any conduct in violation of applicable civil or criminal laws.',
      },
      {
        type: 'paragraph',
        text: '4. No Warranty of Access. Your ability to access the Games or the Sweepstakes Games is not a representation by us that the Games or the Sweepstakes Games are lawful in your jurisdiction of residence, or that the Games/Sweepstakes Games comply with all applicable laws.',
      },
      {
        type: 'paragraph',
        text: '5. Indemnification. You agree that you will, at your own cost and expense, indemnify and hold us and our directors, officers, employees, and agents harmless from and against any and all claims, disputes, liabilities, judgments, settlements, actions, debts, or rights of action, losses of whatever kind, and all costs and fees, including reasonable legal and attorney fees, arising out of or relating to (A) your breach of these Terms; (B) any use or misuse of your Account, the Software, the Services, or the Games by any person, including yourself; (C) your violation of any applicable laws; and/or (D) your negligence or misconduct that results in actual or potential liability to us.',
      },
    ],
  },
  {
    id: 'licensing',
    title: '15. Licensing and Ownership.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. User License. Subject to these Terms, we grant you a personal, non-exclusive, limited, revocable, non-transferable, non-assignable, non-sublicensable, limited license to install and run the Software and to use the Games on a device owned or controlled by you, solely for the purpose of accessing and using the Services and playing the Games in accordance with these Terms, and only for so long as your Account is open. You acknowledge that you are receiving licensed rights only. You may not, directly or indirectly, or authorize any person or entity to: (i) reverse engineer, decompile, disassemble, re-engineer, or otherwise create, attempt to create, or permit, allow, or assist others to create the source code of the Software, the Games, or its structural framework; (ii) create derivative works of the Software or the Games; (iii) use the Software or the Games in whole or in part for any purpose except as expressly provided in these Terms; or (iv) disable or circumvent any access control or related device, process, or procedure established with respect to the Software or the Games. You acknowledge that you have access to sufficient information such that you do not need to reverse engineer the Software or Games in any way to permit other products or information to interoperate with the Software. You are responsible for all use of the Software or the Games that is under your possession or control.',
      },
      { type: 'subheading', text: 'Ownership' },
      {
        type: 'paragraph',
        text: 'All Services, Software, Games, and related materials, all logos, symbols, expansion names and symbols, play symbols, trade dress or "look and feel," all digital assets, and those portions of the Software and Services that are our property, as well as all derivative works or modifications of any of the foregoing, and all related and underlying intellectual property (including without limitation patents, trademarks, trade secrets, and copyrights), are our sole and exclusive property. We reserve all rights not expressly granted herein. Except as expressly set forth herein, no right or license is granted hereunder, express or implied or by way of estoppel, to any intellectual property rights, and your use of our Services, Software, or playing the Games does not convey or imply the right to do so in combination with any other information or products. The computer software, computer graphics, Services, and user interface that we make available to you are owned by, or licensed to, us or our associates/affiliates and are protected by copyright laws. You may use the software only for your own personal, recreational, and entertainment use in accordance with all rules, terms, and conditions we have established (including these Terms and the Integrated Policies) and in accordance with all applicable laws, rules, and regulations. You acknowledge that we are the proprietor or authorized licensee of all intellectual property relating to any content that you post or create in relation to our Services. Your use of the Games and Services does not provide you with any intellectual property rights in the content, Games, or Services.',
      },
      {
        type: 'paragraph',
        text: 'You grant us, and represent and warrant that you have the right to grant us, an irrevocable, perpetual, worldwide, non-exclusive, royalty-free license to use in any way we see fit any information, images, videos, comments, messages, music, or profiles you publish or upload to any website or social media page controlled and operated by us. You must not reproduce or modify the user content (or any of our materials, documents, screenshots, Game screen captures, or other data associated with the Services) in any way, including by removing any copyright or trademark notice. All trademarks and logos displayed in the Games and Services are the property of their respective owners and are protected by applicable trademark and copyright laws.',
      },
    ],
  },
  {
    id: 'third-party',
    title: '16. Third-Party Websites, Links, or Games.',
    blocks: [
      {
        type: 'paragraph',
        text: 'You acknowledge and agree that:',
      },
      {
        type: 'list',
        items: [
          'we are not responsible for third-party websites related to our Games or Services;',
          'we make no guarantee or representation as to the content, functionality, or accuracy of any third-party website, and third-party websites are subject to their own terms and conditions set forth on each such website;',
          'some third-party websites may be fraudulent in nature, offering Gold Coins or Sweeps Coins without authorization, in an effort to induce you to reveal personal information (including passwords, account information, and credit card details). You agree that we are not responsible for any actions you take at the request or direction of these, or any other third-party websites. WE DO NOT AUTHORIZE ANY THIRD PARTY TO OFFER GOLD COINS OR SWEEPS COINS. Any such offer should be deemed fraudulent and disregarded;',
          'links to third-party websites do not indicate a relationship between us and the third party, or any endorsement or sponsorship by us of the third-party website or the goods or services it provides, unless specifically indicated by us; and',
          'where a website controlled and operated by us contains links to various social networking sites, you acknowledge and agree that: any comments or content you post on such social networking sites are subject to the terms and conditions of that particular social networking site; you will not post any comments that are false, misleading, deceptive, or defamatory to us, our employees, agents, officers, or other users or players; and we are not otherwise responsible or liable for any comments or content that you or others post on social networking sites in any manner, to the maximum extent permitted by law.',
        ],
      },
    ],
  },
  {
    id: 'disclaimers',
    title: '17. Disclaimers and Liability Limitations.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. Disclaimer of Liability; No Warranty. IN NO EVENT SHALL WE, OUR AFFILIATES AND SERVICE PROVIDERS, OR ANY OF OUR OR THEIR RESPECTIVE OFFICERS, DIRECTORS, AGENTS, JOINT VENTURERS, EMPLOYEES, ATTORNEYS, OR REPRESENTATIVES BE LIABLE FOR ANY LOST PROFITS, DIMINUTION IN VALUE OR BUSINESS OPPORTUNITY, ANY LOSS, DAMAGE, CORRUPTION, OR BREACH OF DATA OR ANY OTHER INTANGIBLE PROPERTY, OR ANY SPECIAL, INCIDENTAL, INDIRECT, INTANGIBLE, OR CONSEQUENTIAL DAMAGES, WHETHER BASED IN CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE, ARISING OUT OF OR IN CONNECTION WITH AUTHORIZED OR UNAUTHORIZED USE OF OUR SERVICES, GAMES, OR SOFTWARE, OR THESE TERMS, EVEN IF AN AUTHORIZED REPRESENTATIVE OF OURS HAS BEEN ADVISED OF OR KNEW OR SHOULD HAVE KNOWN OF THE POSSIBILITY OF SUCH DAMAGES, AND NOTWITHSTANDING THE FAILURE OF ANY AGREED OR OTHER REMEDY OF ITS ESSENTIAL PURPOSE, EXCEPT TO THE EXTENT OF A FINAL DETERMINATION THAT SUCH DAMAGES WERE A RESULT OF OUR GROSS NEGLIGENCE, FRAUD, WILLFUL MISCONDUCT, OR INTENTIONAL VIOLATION OF LAW.',
      },
      {
        type: 'paragraph',
        text: '2. Limitation of Liability. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, WE ARE NOT AND WILL NOT BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, SPECIAL, PUNITIVE, CONSEQUENTIAL (INCLUDING, WITHOUT LIMITATION, LOST PROFITS, LOST DATA, OR LOSS OF GOODWILL) OR INCIDENTAL DAMAGES ARISING OUT OF OR RELATING TO THESE TERMS OR ANY PRODUCTS OR SERVICES, INCLUDING THE GAMES, GOVERNED BY THESE TERMS.',
      },
      {
        type: 'paragraph',
        text: '3. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, UNDER NO CIRCUMSTANCES WILL WE OR OUR PARENT(S), SUBSIDIARIES OR AFFILIATES, AND EACH OF OUR RESPECTIVE DIRECTORS, OFFICERS, EMPLOYEES, SHAREHOLDERS, AGENTS, CONTRACTORS, LICENSORS, SUPPLIERS AND PARTNERS BE LIABLE TO YOU FOR MORE THAN THE AMOUNT YOU HAVE PAID US IN THE THIRTY (30) DAYS IMMEDIATELY PRECEDING THE DATE ON WHICH YOU FIRST ASSERT ANY SUCH CLAIM. YOU ACKNOWLEDGE AND AGREE THAT IF YOU HAVE NOT PAID US ANY AMOUNTS IN THE THIRTY (30) DAYS IMMEDIATELY PRECEDING THE DATE ON WHICH YOU FIRST ASSERT ANY SUCH CLAIM, YOUR SOLE AND EXCLUSIVE REMEDY FOR ANY DISPUTE WITH US IS TO STOP USING THE PLATFORM AND TO CLOSE YOUR ACCOUNT.',
      },
      {
        type: 'paragraph',
        text: '4. To the fullest extent permitted under applicable law, the maximum liability that either party shall incur arising out of or in any way connected to these terms shall not exceed $50.00. The existence of one or more claims will not increase liability. In no event shall our developer partners, suppliers or licensors have any liability arising out of or in any way connected to our products, information or services.',
      },
      {
        type: 'paragraph',
        text: '5. Further Disclaimers. OUR SERVICES, GAMES, AND SOFTWARE ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY REPRESENTATION OR WARRANTY, WHETHER EXPRESS, IMPLIED, OR STATUTORY. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SPECIFICALLY DISCLAIM ANY IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND/OR NON-INFRINGEMENT. EXCEPT FOR THE EXPRESS STATEMENTS SET FORTH IN THESE TERMS, YOU HEREBY ACKNOWLEDGE AND AGREE THAT YOU HAVE NOT RELIED UPON ANY OTHER STATEMENT OR UNDERSTANDING, WHETHER WRITTEN OR ORAL, WITH RESPECT TO YOUR USE OF AND ACCESS TO OUR SERVICES, SOFTWARE, AND GAMES.',
      },
      {
        type: 'paragraph',
        text: '6. YOU RECOGNIZE AND AGREE THAT THE WARRANTY DISCLAIMERS AND THE INDEMNITIES AND LIMITATIONS OF LIABILITY SET OUT HEREIN, ARE MATERIAL AND BARGAINED-FOR BASES OF THESE TERMS AND CONDITIONS AND THAT THEY HAVE BEEN TAKEN INTO ACCOUNT AND REFLECTED IN THE DECISION BY YOU TO ENTER INTO THESE TERMS AND CONDITIONS. Depending on where you reside and use the Platform, some of the limitations contained in clause 17 may not be permissible. In such case, they will not apply to you, solely to the extent so prohibited.',
      },
      {
        type: 'paragraph',
        text: '7. Clause 17 survives the termination of these Terms for any reason.',
      },
    ],
  },
  {
    id: 'dispute-resolution',
    title: '18. Dispute Resolution; Arbitration; Class Action Waiver',
    blocks: [
      {
        type: 'paragraph',
        text: 'PLEASE READ THIS SECTION CAREFULLY – IT MAY SIGNIFICANTLY AFFECT YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY HEAR YOUR CLAIMS. IT CONTAINS PROCEDURES FOR MANDATORY BINDING ARBITRATION AND A CLASS ACTION WAIVER. THIS CLAUSE 18 WILL BE CONSTRUED UNDER AND BE SUBJECT TO THE FEDERAL ARBITRATION ACT, NOTWITHSTANDING ANY OTHER CHOICE OF LAW SET OUT IN THESE TERMS AND CONDITIONS.',
      },
      { type: 'subheading', text: 'OPT-OUT OF ARBITRATION' },
      {
        type: 'paragraph',
        text: 'You have the right to opt out and not be bound by the arbitration provisions set forth in these Terms by sending written notice of your decision to opt out to support@LukLokCasino.com, or to the U.S. mailing address listed in the "How to Contact Us" section at the end of these Terms. Your email must include your first and last name and a statement that you decline this arbitration clause. By opting out of this clause, you will not be precluded from using the Platform, but neither You nor the Company will be able to invoke the mutual agreement to individually arbitrate to resolve Disputes. Whether to agree to arbitration is an important decision. It is your decision to make and you are not required to rely solely on the information provided in these Terms and Conditions. You should take reasonable steps to conduct further research and, if you wish, to consult with the counsel of your choice.',
      },
      {
        type: 'paragraph',
        text: 'NOTICE OF DECISION TO OPT OUT OF THIS ARBITRATION AGREEMENT SENT AFTER THE THIRTY-DAY PERIOD SHALL NOT BE EFFECTIVE AND USERS MUST PURSUE THEIR DISPUTE THROUGH BINDING ARBITRATION OR SMALL CLAIMS COURT.',
      },
      { type: 'subheading', text: 'INFORMAL PROCESS FIRST' },
      {
        type: 'paragraph',
        text: 'You and the Company agree that, in the event of any dispute between you and the Company Entities, either party will first contact the other party and make a good-faith, sustained effort to resolve the dispute before resorting to more formal means of resolution, including without limitation any court action, after first allowing the receiving party 30 days in which to respond. Both you and the Company agree that this dispute resolution procedure is a condition precedent that must be satisfied before initiating any arbitration against the other party.',
      },
      { type: 'subheading', text: 'BINDING ARBITRATION' },
      {
        type: 'paragraph',
        text: 'Arbitration procedures are generally more efficient, but also simpler and less formal than a lawsuit in court. Arbitration uses a neutral and impartial arbitrator instead of a judge or jury. The arbitrator\'s decisions are as enforceable as any court order and are subject to very limited review by a court. However, an arbitrator can award the same damages and relief on an individual basis that a court can award to an individual. The arbitrator\'s decision will be final and binding. Other rights you or we would have in court may also not be available in arbitration.',
      },
      {
        type: 'paragraph',
        text: 'We both agree to binding arbitration. By agreeing to these Terms, you and Veloraxy Interactive, Inc mutually agree that any and all past, present and future disputes, claims or causes of action between you and Veloraxy Interactive, Inc. or Veloraxy Interactive, Inc\'s licensors, distributors, suppliers, or agents, which arise out of, or are related to, these Terms and Conditions, the formation of these Terms and Conditions, the validity or scope of these Terms and Conditions, including this Clause 18, your participation or other access to or use of the Platform, or any other dispute concerning the breach, enforcement, construction, validity, interpretation, or enforceability, of these Terms and Conditions or this Agreement between You and Veloraxy Interactive, Inc. including the arbitrability of any dispute, and whether arising prior to or after your agreement to this clause 18 (collectively, "Disputes"), shall be resolved exclusively and finally by binding arbitration governed by the procedure set out below. For the avoidance of doubt, we agree and delegate to the arbitrator the exclusive authority to determine his or her own jurisdiction over the Dispute, including any objections to the scope, validity, enforceability, or severability of this Agreement or its provisions, as well as the arbitrability of any claims or counterclaims presented as part of the Dispute.',
      },
      {
        type: 'paragraph',
        text: 'This Section does not apply if you are (i) a resident of the EEA or any jurisdiction which does not allow these arbitration provisions; (ii) you opt out of arbitration as provided in this section; or (iii) you qualify for the exceptions provided below.',
      },
      { type: 'subheading', text: 'ARBITRATION PROCEDURES' },
      {
        type: 'paragraph',
        text: 'This Arbitration Agreement evidences a transaction in interstate commerce, and the Federal Arbitration Act governs all substantive and procedural interpretation and enforcement of this Arbitration Agreement.',
      },
      {
        type: 'list',
        items: [
          'You and the Company agree that any Claim will be settled by final and binding arbitration, conducted in the English language, administered by JAMS under its Comprehensive Arbitration Rules and Procedures or successor rules, which are in effect at the time the arbitration is sought (the "JAMS Rules").',
          'The JAMS Rules are hereby incorporated into this Agreement and Terms and Conditions. Those rules are available at www.jamsadr.com. PLEASE REVIEW THESE RULES CAREFULLY AS THEY GOVERN THE PROCEDURES AND COSTS ASSOCIATED WITH THE ARBITRATION OF DISPUTES BETWEEN YOU AND THE COMPANY. You may also access the Rules by calling 1-800-352-5267.',
          'Arbitration will be handled by a sole arbitrator in accordance with the JAMS Rules.',
          'JAMS shall retain discretion as to the interpretation and application of the JAMS Rules.',
          'The arbitrator shall be authorized to award any remedies, including injunctive relief, that would be available to you in an individual lawsuit and that are not waivable under applicable law.',
          'The arbitrator\'s decision shall be final and binding. Judgment on the arbitration award may be entered in any court that has jurisdiction.',
          'Any arbitration under these Terms will take place on an individual basis – class arbitrations and class actions are not permitted.',
          'You understand that by agreeing to these Terms, you and the Company are each waiving the right to trial by jury and the right to participate in a class action or class arbitration.',
          'Unless ordered otherwise, the arbitration will take place in the State of Delaware, unless the parties agree to conduct proceedings remotely, by telephonic or computer technology means.',
          'All parties participating in the arbitration process have the right, at their own expense, to be represented by a spokesperson of their own choosing.',
          'Except as may be required by law, neither party nor an arbitrator may disclose the existence, content, or results of any arbitration hereunder without prior written consent of both parties.',
        ],
      },
      { type: 'subheading', text: 'EXCEPTIONS' },
      {
        type: 'paragraph',
        text: 'Notwithstanding the foregoing, you and the Company agree that the following types of disputes will be resolved in a court of proper jurisdiction:',
      },
      {
        type: 'list',
        items: [
          'disputes or claims within the jurisdiction of a small claims court consistent with the jurisdictional and dollar limits that may apply, so long as the dispute is brought and maintained as an individual dispute and not as a class, representative, or consolidated action or proceeding; the parties further agree that, to the extent applicable, the JAMS Mass Arbitration Procedures and Guidelines shall apply.',
          'disputes or claims for misuse of intellectual property, confidentiality breaches, fraud, platform abuse, counterfeit goods, or unauthorized access.',
        ],
      },
      { type: 'subheading', text: 'COSTS OF ARBITRATION' },
      {
        type: 'paragraph',
        text: 'Each party is responsible for its own costs and expenses related to arbitration and the Claim, except that fees and costs may be awarded as provided pursuant to applicable law. If the arbitrator finds that either the substance of your claim or the relief sought in the demand is frivolous or brought for an improper purpose (as measured by the standards set forth in Federal Rule of Civil Procedure 11(b)), then the payment of all fees will be governed by the JAMS rules.',
      },
      { type: 'subheading', text: 'WAIVER OF RIGHT TO BRING CLASS ACTION AND REPRESENTATIVE CLAIMS' },
      {
        type: 'paragraph',
        text: 'To the fullest extent permitted by applicable law, you and the Company each agree that any proceeding to resolve any dispute, claim, or controversy will be brought and conducted ONLY IN THE RESPECTIVE PARTY\'S INDIVIDUAL CAPACITY AND NOT AS PART OF ANY CLASS (OR PURPORTED CLASS), CONSOLIDATED, MULTIPLE-PLAINTIFF, PRIVATE ATTORNEY GENERAL OR REPRESENTATIVE ACTION OR PROCEEDING (a "CLASS ACTION"). You and the company EXPRESSLY WAIVE THE RIGHT TO SEEK TO RECOVER LOSSES OR DAMAGES (WHETHER FOR YOURSELF OR OTHERS) INCURRED BY A THIRD PARTY. You and the Company AGREE TO WAIVE THE RIGHT TO PARTICIPATE AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS ACTION. You and the Company EXPRESSLY WAIVE ANY ABILITY TO MAINTAIN A CLASS ACTION IN ANY FORUM. If the dispute is subject to arbitration, THE ARBITRATOR WILL NOT HAVE THE AUTHORITY TO COMBINE OR AGGREGATE CLAIMS, CONDUCT A CLASS ACTION, OR MAKE AN AWARD TO ANY PERSON OR ENTITY NOT A PARTY TO THE ARBITRATION. Further, you and the Company agree that the ARBITRATOR MAY NOT CONSOLIDATE PROCEEDINGS FOR MORE THAN ONE PERSON\'S CLAIMS, AND IT MAY NOT OTHERWISE PRESIDE OVER ANY FORM OF A CLASS ACTION. For the avoidance of doubt, however, you may seek individual injunctive relief to the extent authorized by law. If a court (after exhaustion of all appeals) declares any of this Class Action Waiver unenforceable, then all other aspects of the case must be arbitrated first. After completing arbitration, the remaining (non-arbitrable) aspects of the case will then be decided by a court.',
      },
      {
        type: 'paragraph',
        text: 'Jury Trial Waiver. TO THE MAXIMUM EXTENT PERMITTED BY LAW, YOU AND WE EACH WAIVE ANY RIGHT TO A JURY TRIAL IN ANY PERMITTED COURT PROCEEDING.',
      },
      {
        type: 'paragraph',
        text: 'If any provision of Clause 18 is found to be unenforceable, the remaining provisions shall remain in full force and effect. Without limiting the foregoing, if any portion of Clause 18 is found to be unenforceable, the parties agree that the remaining portions of Clause 18 shall continue to apply, and the unenforceable portion shall be construed to the maximum extent permitted by applicable law.',
      },
    ],
  },
  {
    id: 'complaints',
    title: '19. Complaints and Customer Support.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. If you would like to contact our Customer Support department or have a complaint regarding our Services (including any Game), you may contact us at support@LukLokCasino.com. ALL EMAIL COMMUNICATIONS BETWEEN YOU AND US SHOULD BE CARRIED OUT USING THE EMAIL ADDRESS YOU HAVE REGISTERED WITH AND THAT IS ASSOCIATED WITH YOUR ACCOUNT. FAILURE TO DO SO MAY RESULT IN OUR RESPONSE BEING DELAYED.',
      },
      {
        type: 'paragraph',
        text: '2. The following information must be included in any written communication with us (including a complaint):',
      },
      {
        type: 'list',
        items: [
          'your username;',
          'your first and last name, as registered with your Account;',
          'a detailed explanation of the complaint or claim;',
          'any specific dates and times associated with the complaint or claim (if applicable); and',
          'any evidence supporting your complaint or claim, including screenshots.',
        ],
      },
      {
        type: 'paragraph',
        text: '3. Failure to submit a written communication containing the information outlined above may result in a delay in our ability to identify and respond to your complaint or claim in a timely manner. We strive to inquire into official complaints immediately. Our goal is to respond to all complaints within 10 days, but no later than 20 days. In some circumstances we will require additional time to investigate, identify the issues, and otherwise respond to your inquiry. If we anticipate delays, we will inform you via the email address associated with your Account.',
      },
    ],
  },
  {
    id: 'miscellaneous',
    title: '20. Miscellaneous Provisions.',
    blocks: [
      {
        type: 'paragraph',
        text: '1. We are not a financial institution. You are not entitled to any interest on any Prizes associated with your Account, and we are not otherwise a financial institution.',
      },
      {
        type: 'paragraph',
        text: '2. No legal or financial advice. We do not provide any legal, tax, or financial advice, and you agree to seek independent counsel regarding the same.',
      },
      {
        type: 'paragraph',
        text: '3. Entire Agreement. These Terms constitute the entire agreement between you and us. There are no other agreements; any prior agreements, arrangements, or understandings have been merged into these Terms, except as otherwise stated herein with respect to the Integrated Policies, which Integrated Policies are expressly a part of these Terms as if fully restated herein.',
      },
      {
        type: 'paragraph',
        text: '4. Choice of Law. These Terms, your use of our Services, and our entire relationship will be governed by, and interpreted in accordance with, the laws of the State of Delaware in the United States, without regard to Delaware\'s conflict-of-laws principles. The Federal Arbitration Act ("FAA") shall govern the interpretation and enforcement of Clause 18 of these Terms and Conditions and any question of whether a dispute is subject to arbitration',
      },
      {
        type: 'paragraph',
        text: '5. Severability. To the extent that any part of these Terms (or any of the Integrated Policies) is found by a court to be unenforceable or invalid, the unenforceable or invalid portion shall be severed from the rest of the Terms, and the remaining Terms shall be given their full effect to the maximum extent permitted by law. In such cases, the part deemed invalid or unenforceable will be amended in a manner consistent with the applicable law to reflect, as closely as possible, the Company\'s original intent',
      },
      {
        type: 'paragraph',
        text: '6. Notices to You by Email. You agree that we may provide any and all notices to you via the email address you provide at the time of Account registration, and that all such notices shall be deemed given at the time they are sent.',
      },
      {
        type: 'paragraph',
        text: '7. Assignment. We may assign these Terms at our discretion, in whole or in part, at any time, without notice to you. You may not assign or transfer these Terms or any license granted to you by us under these Terms.',
      },
      {
        type: 'paragraph',
        text: '8. No Waiver. Any failure or delay by us to enforce any provision of these Terms shall not constitute a waiver of any applicable rights or be construed to prevent us from enforcing such Terms in the future.',
      },
      {
        type: 'paragraph',
        text: '9. No Agency. Nothing in these Terms and Conditions will be construed as creating any agency, partnership, trust arrangement, fiduciary relationship or any other form of joint enterprise between you and us.',
      },
      {
        type: 'paragraph',
        text: '10. Force Majeure. We are not responsible or liable for any failure to perform, or delay in our performance of, any obligations or responsibilities under these Terms that are due to events outside our reasonable control.',
      },
      {
        type: 'paragraph',
        text: '11. Explanation of Terms. We consider these Terms and the Integrated Policies to be open and fair. If you need any explanation regarding these Terms or the Integrated Policies, or any other part of our Services, please contact Customer Support. These Terms control in the event of any inconsistency between a communication via email or chat and these Terms. We reserve the right to record all communications.',
      },
      {
        type: 'paragraph',
        text: '12. Business Transfers. In the event of a change of control, merger, acquisition, or sale of assets of ours, your Account and associated data may be part of the assets transferred to the purchaser or acquiring party. In such an event, we will provide you with notice via email or via our Services explaining your options with regard to the transfer of your Account.',
      },
      {
        type: 'paragraph',
        text: '13. Special Disclosure Regarding the Privacy Policy. These Terms incorporate our Privacy Policy as if the Privacy Policy were set forth in its entirety here. The Privacy Policy explains the policies put in place and used by us to protect your privacy as you use the Games or otherwise use our Services. We receive, store, and use all information that you submit to us, and all information you submit in registering for an Account and using the Games, in accordance with the Privacy Policy, so please read it carefully. As with these Terms, the Privacy Policy may change from time to time, and your continued access to your Account and use of the Services and the Games indicates your acceptance of the Privacy Policy as amended; it is therefore important for you to periodically access and review the Privacy Policy.',
      },
      {
        type: 'paragraph',
        text: '14. Special Disclosure Regarding the Responsible Social Gameplay Policy. We actively support responsible social gameplay and encourage you to make use of a variety of responsible social gameplay features in order to better manage your Account. Please review our Responsible Social Gameplay Policy for full details.',
      },
      {
        type: 'list',
        items: [
          'Although we will use all reasonable methods to enforce our responsible social gameplay policies, we disclaim any responsibility or liability if you nevertheless continue gameplay and/or seek to use the Services with the intention of deliberately avoiding the policy measures in place, and/or where we are unable to enforce our measures or policies for reasons outside our reasonable control.',
          'Take a Break (Time-Out) and Self-Exclusion. You may, at any time, request a time-out or self-exclusion from our Games by contacting Customer Support. To view the various options available, refer to our Responsible Social Gameplay Policy.',
          'Player Protection Policy. We want to ensure that you enjoy your experience playing our Games in a safe and responsible manner. We encourage you to take advantage of the limits and control features available to you as part of our Responsible Social Gameplay Policy.',
        ],
      },
    ],
  },
  {
    id: 'not-gambling',
    title: '21. Not a Casino or Gambling.',
    blocks: [
      {
        type: 'paragraph',
        text: 'We are not a casino, and we do not offer gambling. When you purchase Gold Coins from us, you are purchasing entertainment to play our simulated casino-style games, and not the chance to win money or anything else of actual value. When you receive Sweeps Coins, you receive them for free. You have the opportunity to win a real-money prize by entering your Sweeps Coins (received for free and without any consideration) into a contest of chance.',
      },
    ],
  },
  {
    id: 'contact',
    title: '22. How to Contact Us.',
    blocks: [
      {
        type: 'paragraph',
        text: 'For Customer Support inquiries, complaints, or any other correspondence regarding these Terms, please contact us at support@LukLokCasino.com, or by mail at: Veloraxy Interactive, Inc., 8 The Green, Suite A, Dover, DE 19901.',
      },
      {
        type: 'paragraph',
        text: '© 2026 Veloraxy Interactive, Inc. All rights reserved.',
      },
    ],
  },
]
