/**
 * Google Apps Script - Webhook Handler for Supabase / Stripe
 */

const PACK_ICONS = {
  'heritage_collection': 'https://tenerifewonders.github.io/mirumiter/icons/heritage.png',
  'heritage': 'https://tenerifewonders.github.io/mirumiter/icons/heritage.png',
  'mystic_collection': 'https://tenerifewonders.github.io/mirumiter/icons/mystic.png',
  'mystic': 'https://tenerifewonders.github.io/mirumiter/icons/mystic.png',
  'seaside_collection': 'https://tenerifewonders.github.io/mirumiter/icons/seaside.png',
  'seaside': 'https://tenerifewonders.github.io/mirumiter/icons/seaside.png',
  'discovery_collection': 'https://tenerifewonders.github.io/mirumiter/icons/discovery.png',
  'discovery': 'https://tenerifewonders.github.io/mirumiter/icons/discovery.png',
  'all_access': 'https://tenerifewonders.github.io/mirumiter/icons/discovery.png'
};

const ROUTE_ICONS = {
  'santa-cruz': 'https://tenerifewonders.github.io/mirumiter/icons/12-4.png',
  'teide': 'https://tenerifewonders.github.io/mirumiter/icons/13-4.png',
  'costa-adeje': 'https://tenerifewonders.github.io/mirumiter/icons/14-4.png',
  'anaga': 'https://tenerifewonders.github.io/mirumiter/icons/15-4.png',
  'la-laguna': 'https://tenerifewonders.github.io/mirumiter/icons/16-4.png',
  'puerto-cruz': 'https://tenerifewonders.github.io/mirumiter/icons/17-4.png',
  'quinta': 'https://tenerifewonders.github.io/mirumiter/icons/19-4.png',
  'candelaria': 'https://tenerifewonders.github.io/mirumiter/icons/22-4.png',
  'la-orotava': 'https://tenerifewonders.github.io/mirumiter/icons/23-4.png'
};

const ROUTE_NAMES = {
  'santa-cruz': { en: 'Santa Cruz de Tenerife', de: 'Santa Cruz de Tenerife', fr: 'Santa Cruz de Tenerife' },
  'teide': { en: 'Teide National Park', de: 'Teide Nationalpark', fr: 'Parc National del Teide' },
  'costa-adeje': { en: 'Costa Adeje', de: 'Costa Adeje', fr: 'Costa Adeje' },
  'anaga': { en: 'Anaga Rural Park', de: 'Anaga Landschaftspark', fr: 'Parc Rural d\'Anaga' },
  'la-laguna': { en: 'San Cristóbal de La Laguna', de: 'San Cristóbal de La Laguna', fr: 'San Cristóbal de La Laguna' },
  'puerto-cruz': { en: 'Puerto de la Cruz', de: 'Puerto de la Cruz', fr: 'Puerto de la Cruz' },
  'quinta': { en: 'La Quinta', de: 'La Quinta', fr: 'La Quinta' },
  'candelaria': { en: 'Candelaria', de: 'Candelaria', fr: 'Candelaria' },
  'la-orotava': { en: 'La Orotava', de: 'La Orotava', fr: 'La Orotava' }
};

const BUNDLE_ROUTES = {
  'heritage_collection': ['santa-cruz', 'anaga', 'la-orotava'],
  'heritage': ['santa-cruz', 'anaga', 'la-orotava'],
  'mystic_collection': ['teide', 'la-laguna', 'quinta'],
  'mystic': ['teide', 'la-laguna', 'quinta'],
  'seaside_collection': ['costa-adeje', 'puerto-cruz', 'candelaria'],
  'seaside': ['costa-adeje', 'puerto-cruz', 'candelaria'],
  'discovery_collection': ['santa-cruz', 'teide', 'costa-adeje', 'anaga', 'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta'],
  'discovery': ['santa-cruz', 'teide', 'costa-adeje', 'anaga', 'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta'],
  'all_access': ['santa-cruz', 'teide', 'costa-adeje', 'anaga', 'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta']
};

function doPost(e) {
  try {
    const rawContent = e && e.postData ? e.postData.contents : '';
    let data = {};
    try { data = JSON.parse(rawContent); } catch (pErr) {}

    // Fail-proof email extraction
    let email = data.email || data.user_email || data.customer_email || '';
    if (!email && rawContent) {
      const emailMatch = rawContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];
    }

    // Fail-proof guide key extraction
    const rawString = (rawContent + ' ' + JSON.stringify(data)).toLowerCase();
    let guideKey = '';
    const knownKeys = [
      'heritage_collection', 'heritage',
      'mystic_collection', 'mystic',
      'seaside_collection', 'seaside',
      'discovery_collection', 'discovery', 'all_access',
      'santa-cruz', 'teide', 'costa-adeje', 'anaga',
      'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta'
    ];
    for (var i = 0; i < knownKeys.length; i++) {
      var k = knownKeys[i];
      if (rawString.indexOf(k) !== -1) {
        guideKey = k;
        break;
      }
    }

    // Fail-proof license extraction (extracts any LIC-XXXXXX codes in raw content)
    let licenses = [];
    if (rawContent) {
      const licMatches = rawContent.match(/LIC-[A-Z0-9]+/gi) || [];
      licenses = licMatches.map(function(m) { return m.toUpperCase(); });
      licenses = licenses.filter(function(item, pos) { return licenses.indexOf(item) === pos; });
    }

    // Detect language
    let lang = 'en';
    if (rawString.indexOf('_de') !== -1) lang = 'de';
    else if (rawString.indexOf('_fr') !== -1) lang = 'fr';

    // Record in Google Sheets - one row per guide/license (matching historical format)
    try {
      const ss = SpreadsheetApp.openById('1uvSuneI-oah9zS8ykVqOcvP9BUxPCaf8x9phgtB46kU');
      const sheet = ss.getActiveSheet();
      const isBundle = !!BUNDLE_ROUTES[guideKey];
      if (isBundle) {
        const routesList = BUNDLE_ROUTES[guideKey];
        routesList.forEach(function(rKey, index) {
          const lic = licenses[index] || licenses[0] || '';
          sheet.appendRow([new Date(), email, lic, rKey + '_' + lang, lang]);
        });
      } else {
        const lic = licenses[0] || '';
        sheet.appendRow([new Date(), email, lic, guideKey + '_' + lang, lang]);
      }
    } catch (sheetErr) {
      Logger.log('Sheet logging skipped: ' + sheetErr);
    }

    // Build & Send Customer Email
    if (email) {
      sendCustomerEmail(email, guideKey, licenses, lang);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      email: email, 
      guideKey: guideKey, 
      licensesCount: licenses.length 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendCustomerEmail(email, guideKey, licenses, lang) {
  const isBundle = !!BUNDLE_ROUTES[guideKey];
  const licenseParam = licenses.join(',');
  const appUrl = `https://tenerifewonders.github.io/mirumiter/?lang=${lang}&license=${licenseParam}`;

  // Only show top header icon for Collection Packs (not for single guides)
  let headerIconUrl = isBundle ? (PACK_ICONS[guideKey] || '') : '';

  let titleText = '';
  if (guideKey.indexOf('heritage') !== -1) titleText = 'Heritage Collection';
  else if (guideKey.indexOf('mystic') !== -1) titleText = 'Mystic Collection';
  else if (guideKey.indexOf('seaside') !== -1) titleText = 'Seaside Collection';
  else if (guideKey.indexOf('discovery') !== -1 || guideKey.indexOf('all_access') !== -1) titleText = 'Discovery Collection';
  else titleText = (ROUTE_NAMES[guideKey] && ROUTE_NAMES[guideKey][lang]) || guideKey;

  let itemsHtml = '';
  if (isBundle) {
    const routesList = BUNDLE_ROUTES[guideKey];
    routesList.forEach((rKey, index) => {
      const rName = (ROUTE_NAMES[rKey] && ROUTE_NAMES[rKey][lang]) || rKey;
      const rIcon = ROUTE_ICONS[rKey] || '';
      const lic = licenses[index] || licenses[0] || '';
      itemsHtml += `
        <tr>
          ${rIcon ? `<td width="50" valign="middle" style="padding-bottom: 12px;"><img src="${rIcon}" width="38" height="38" style="display: block; margin: 0 auto;" alt=""></td>` : ''}
          <td valign="middle" style="padding-bottom: 12px; font-size: 15px;"><strong>${rName}</strong> ${lic ? `<span style="color: #64748b; font-size: 13px;">(License: ${lic})</span>` : ''}</td>
        </tr>`;
    });
  } else {
    const rName = (ROUTE_NAMES[guideKey] && ROUTE_NAMES[guideKey][lang]) || guideKey;
    const rIcon = ROUTE_ICONS[guideKey] || '';
    const lic = licenses[0] || '';
    itemsHtml += `
      <tr>
        ${rIcon ? `<td width="50" valign="middle"><img src="${rIcon}" width="38" height="38" style="display: block; margin: 0 auto;" alt=""></td>` : ''}
        <td valign="middle" style="font-size: 15px;"><strong>${rName}</strong> ${lic ? `<span style="color: #64748b; font-size: 13px;">(License: ${lic})</span>` : ''}</td>
      </tr>`;
  }

  const subject = `Your Tenerife Wonders Audioguide Access`;
  const headerImageHtml = headerIconUrl ? `<img src="${headerIconUrl}" height="42" style="vertical-align: middle; margin-right: 8px;" alt="">` : '';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; color: #1e293b;">
      <h2 style="text-align: center; color: #0f172a; margin-top: 0;">Thank you for your purchase!</h2>
      
      <div style="text-align: center; margin: 20px 0;">
        ${headerImageHtml}
        <h3 style="display: inline-block; vertical-align: middle; margin: 0; color: #0284c7; font-size: 20px;">${titleText}</h3>
      </div>

      <p style="font-size: 14px; color: #475569;">The following audioguide${isBundle ? 's are' : ' is'} included in your ${isBundle ? 'collection' : 'purchase'}:</p>
      
      <div style="margin: 16px 0; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${appUrl}" target="_blank" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 15px; display: inline-block;">Open App & Unlock ${isBundle ? 'Collection' : 'Audioguide'}</a>
      </div>

      <p style="font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px;">
        Link: <a href="${appUrl}" style="color: #0284c7;">${appUrl}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">Tenerife Wonders &copy; 2026 - Unique Audioguide Experiences</p>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}
