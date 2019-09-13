const $ = window.$;
let possibilityIdGlobal = "";
const debug = window.debug;
const chrome = window.chrome;

/**
 *
 * @param enabled
 * @returns {boolean}
 */
function displayWeVoteUI (enabled) {  // eslint-disable-line no-unused-vars
  try {
    if(enabled) {
      console.log("Displaying WeVote UI --------------------------------" );
      let hr = window.location.href;
      let topMenuHeight = 75;
      let sideAreaWidth = 400;
      let iFrameHeight = window.innerHeight - topMenuHeight;
      let iFrameWidth = window.innerWidth - sideAreaWidth;
      let bod = $('body');
      $(bod).children().wrapAll("<div id='weTrash' >").hide();  // if you remove it, other js goes nuts
      $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before weTrash
      $('#weTrash').insertAfter('#weContainer');

      let weContainer = $('#weContainer');
      $(weContainer).append("" +
        "<span id='topMenu'>" +
        "</span>").append("<div id='weFlexGrid' ></div>");

      let weFlexGrid = $('#weFlexGrid');
      $(weFlexGrid).append('<aside id="frameDiv"><iframe id="frame" width=' + iFrameWidth + ' height=' + iFrameHeight + '></iframe></aside>');
      $(weFlexGrid).append('<section id="sideArea"></section>');

      $("#frame").attr("src", hr);

      getHighlights();
      topMenu();
      updateTopMenu();
      signIn(false);

      greyAllPositionPanes(false);
    } else {
      // Disable UI (reload the page)
      console.log("Unloading WeVote UI --------------------------------");
      location.reload();
    }
  } catch (err) {
    console.log("jQuery dialog in contentWeVoteUI threw: ", err);
  }
  return true;  // indicates that we call the response function asynchronously.  https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
}


/*
  May 16, 2019
  TODO: For now if the API server is swapped local/production you will need to get a new device ID.
  With the extension running, go to the wevote.us or localhost:3000 page, and open the popup, and press the login button.
  Then when you navigate to some endorsement page. the device id will become available in local storage.
  Sept 10, 2019, you may have to clear localStorage['voterDeviceId'].  You will have to be running a local webapp, which
  is pointed to a local python server, so that they all share a voterDeviceId.  If you have had a valid voterDeviceId
  in the past, you can get the most recent one form pgAdmin/voter_voterdevicelink and paste it into the value for
  voterDeviceId in the chrome-extension's DevTools Application tab.
 */

function signIn(showDialog) {
  debug&&console.log("new signIn");
  chrome.runtime.sendMessage({ command: "getVoterInfo",},
    function (response) {
      const { success, error, err, voterName, photoURL, voterWeVoteId, voterEmail } = response.data;
      console.log("STEVE signIn response: ", response);
      let voterInfo = {
        success: success,
        error: error,
        err: err,
        name: voterName,
        photo: photoURL,
        voterId: voterWeVoteId,
        email: voterEmail
      };

      if (voterInfo.success) {
        $('#signIn').replaceWith(
          "<img id='signOut' class='voterPhoto noStyleWe' alt='candidate' width='35' height='35' src='" + voterInfo.photo + "' style='margin: 12px;'  />");
        updatePositionsPanel();
        document.getElementById("signOut").addEventListener('click', function () {
          console.log("Sign Out pressed");
          $('#furlable-2').removeAttr('hidden');
          signOut();
          return false;
        });
      } else {
        console.log("signIn() getVoterInfo returned error: " + voterInfo.error + ", err: " + voterInfo.err);
        if (showDialog) {
          $('#loginPopUp').dialog({
            dialogClass: "no-close",
            width: 500,
            position: { my: "right top", at: "left bottom", of: "#signIn" },
            open: function() {
              const markup = "<div style='text-align: center;'><b>Authenticate this \"We Vote Endorsement Tool\" Chrome extension,</b><br>" +
                " by logging into the We Vote WebApp (https://wevote.us) in another tab.<br><br>" +
                "Once you have logged into the We Vote Web App, " +
                "navigate back to this tab and press the <b>SIGN IN</b> button again to authenticate the \"We Vote Endorsement Tool\" Chrome Extension.</div>";
              $(this).html(markup);
            },
          });
        }
      }
    });
  return false;
}

function signOut() {
  console.log("signOut has not been implemented.");
}

function topMenu() {
  let topMarkup = "" +
    "<div style='margin-left:12px; margin-bottom:4px; align-content: center; width: 10%'>" +
    "  <img id='orgLogo' src='https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png' alt=''>" +
    "  <b><span id='orgName'></span></b>" +
    "</div>" +
    "<input type='text' id='email' name='email' placeholder='Email' >" +
    "<input type='text' id='topComment' name='topComment' placeholder='Comment here... (for unauthenticated suggestions)' >" +
    "<div style='width: 100%; float: right'>" +
    "  <button type='button' id='signIn' class='signInButton weButton noStyleWe'>SIGN IN</button>" +
    "</div>" +
    "<span id='loginPopUp'></span>";
  $('#topMenu').append(topMarkup);

  // console.log("BEFORE ADDING SIGN IN HANDLER");
  document.getElementById("signIn").addEventListener('click', function () {
    console.log("Sign in pressed");
    signIn(true);
    return false;
  });
}

// Get the href into the extension
function getHighlights() {
  debug&&console.log("getHighlights() called");
  chrome.runtime.sendMessage({ command: "getHighlights", url: window.location.href },
    function (response) {
      debug&&console.log("getHighlights() response", response);

      if (response ) {
        debug&&console.log("SUCCESS: getHighlights received a response");
      } else {
        debug&&console.log("ERROR: getHighlights received empty response");
      }
    });
}


// Call into the background script to do a voterGuidePossibilityRetrieve() api call, and return the data, then update the top menu
function updateTopMenu() {
  debug&&console.log("updateTopMenu()");
  chrome.runtime.sendMessage({ command: "getTopMenuData", url: window.location.href },
    function (response) {
      debug&&console.log("updateTopMenu() response", response);

      if (response && Object.entries(response).length > 0 ) {
        const { email, orgName, twitterHandle, weVoteId, orgWebsite, orgLogo, possibilityUrl, possibilityId } = response.data;  // eslint-disable-line no-unused-vars

        $('#orgLogo').attr("src", orgLogo);
        $("#orgName").text(orgName ? orgName : "An Organization has not been stored for this URL. ");
        $("#email").css('background', 'lightgrey').attr("disabled", true);      // The purpose of this field is to allow cloudsourced comments from un-authenticated, and untrusted public voters
        $("#topComment").css('background', 'lightgrey').attr("disabled", true); // Also for cloudsourced comments from un-authenticated, and untrusted public voters
        possibilityIdGlobal = possibilityId;
        console.log("updateTopMenu possibilityIdGlobal: " + possibilityIdGlobal);
        if (orgName === undefined) {
          rightNewGuideDialog();
        }
        updatePositionsPanel();
      } else {
        console.log("ERROR: updateTopMenu received empty response");
      }
    });
}

function updatePositionsPanel() {
  debug&&console.log("STEVE getPositions()");
  chrome.runtime.sendMessage({ command: "getPositions", url: window.location.href, possibilityId: possibilityIdGlobal },
    function (response) {
      debug&&console.log("STEVE getPositions() response", response);
      const defaultImage = "https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png";
      if ((response && Object.entries(response).length > 0) && (response.data !== undefined) && (response.data.length > 0)) {
        let data = response.data;
        let l = data.length;
        let selector = $("#sideArea");
        if (l > 0) {
          for (let i = 0; i < l; i++) {
            debug&&console.log("STEVE getPositions data: ", data[i]);
            let { ballot_item_name: name, position_stance_stored: stance, statement_text_stored: comment, more_info_url_stored: url,
              political_party: party, office_name: officeName, ballot_item_image_url_https_large: imageURL, candidate_we_vote_id: candidateWeVoteId,
              google_civic_election_id: googleCivicElectionId, office_we_vote_id: officeWeVoteId, organization_we_vote_id: organizationWeVoteId,
              possibility_position_id: possibilityPositionId, possibility_position_number: possibilityPositionNumber, organization_name: organizationName,
              voter_guide_possibility_id: voterGuidePossibilityId
            } = data[i];

            let position = {
              name,
              party,
              office: officeName ? officeName : "",
              photo: (imageURL && imageURL.length > 0 ) ? imageURL : defaultImage,
              comment: ( comment && comment.length ) ? comment : "",
              stance,
              url: url ? url : "",
              candidateWeVoteId,
              googleCivicElectionId,
              officeWeVoteId,
              organizationWeVoteId,
              organizationName,
              possibilityPositionId,
              possibilityPositionNumber,
              voterGuidePossibilityId
            };
            rightPositionPanes(i, position, selector);
          }
        }
        attachClickHandlers();
      } else {
        console.log("ERROR: updatePositionsPanel() getPositions returned an empty response or no data element.")
      }
    }
  );
}

function rightPositionPanes(i, candidate, selector) {
  let dupe = $(".candidateName:contains('" + candidate.name + "')").length;
  debug&&console.log("rightPositionPanes checked for duplicate " + candidate.name + ": " + dupe);
  let furlNo = "furlable-" + i;
  let candNo = "candidate-" + i;
  if (!dupe) {
    let markup = "" +
      "<div class='candidate " + candNo + "'>" +
      "  <div class='unfurlable'>" +
      "    <span class='unfurlableTopMenu'>" +
      "      <img class='photo noStyleWe' alt='candidate' src=" + candidate.photo + " />" +
      "      <div class='nameBox  noStyleWe'>" +
      "        <div class='candidateName'>" + candidate.name + "</div>" +
      "        <div class='candidateParty'>" + candidate.party + "</div>" +
      "        <div class='officeTitle'>" + candidate.office + "</div>" +
      "      </div>" +
      "    </span>" +
      "    <input type='hidden' id='candidateWeVoteId-" + i + "' value='" + candidate.candidateWeVoteId + "'>" +
      "    <input type='hidden' id='voterGuidePossibilityId-" + i + "' value='" + candidate.voterGuidePossibilityId + "'>" +
      "    <input type='hidden' id='possibilityPositionNumber-" + i + "' value='" + candidate.possibilityPositionNumber + "'>" +
      "    <input type='hidden' id='possibilityPositionId-" + i + "' value='" + candidate.possibilityPositionId + "'>" +
      "    <input type='hidden' id='organizationWeVoteId-" + i + "' value='" + candidate.organizationWeVoteId + "'>" +
      "    <input type='hidden' id='organizationName-" + i + "' value='" + candidate.organizationName + "'>" +
      "  </div>" +
      "  <div id= " + furlNo + " class='furlable' hidden>" +
      "    <span class='buttons'>" +
             supportButton(i, 'endorse', candidate.stance) +
             supportButton(i, 'oppose', candidate.stance) +
             supportButton(i, 'info', candidate.stance) +
      "    </span>" +
      "    <textarea rows='6' class='endorseInput-" + i + "' />" +
      "    <br>If a more detailed endorsement page exists, enter its URL here:" +
      "    <input type='text' class='sourceURL-" + i + "' />" +
      "    <span class='bottomButton'>" +
      "      <button type='button' class='saveButton-" + i + " weButton noStyleWe' >Save</button>" +
      "    </span>" +
      "  </div>" +
      "</div>";
    $(selector).append(markup);
    $('.endorseInput' + i).val(candidate.comment);
    $('.sourceURL' + i).val(candidate.url);
    $(selector).css({
      'height': $('#frameDiv').height() + 'px',
      'overflow': 'scroll'
    });
  }
}

function greyAllPositionPanes(booleanGreyIt) {
  if (booleanGreyIt) {
    $('div.candidate').css('opacity', '0.25');
  } else {
    $('div.candidate').css('opacity', '1');
  }

}

function selectOneDeselectOthers(type, targetFurl) {
  console.log("BBBBBBBBBBBBBBBB tri-button clicked: " + type);
  let buttons = $(targetFurl).find(":button");
  buttons.each((i, but) => {
    const className = but.className;   // "infoButton-2 weButton noStyleWe deselected"
    const off = className.indexOf('-') + 1;
    const number = className.substring(off, off+1);
    const iterationType = className.substring(0, className.indexOf('Button'));
    /* eslint-disable indent */
    switch (iterationType) {
      case 'endorse':
        $(but).replaceWith(supportButton(number, iterationType, className.startsWith(type) ? 'SUPPORT': ''));
        break;
      case 'oppose':
        $(but).replaceWith(supportButton(number, iterationType, className.startsWith(type) ? 'OPPOSE': ''));
        break;
      case 'info':
        $(but).replaceWith(supportButton(number, iterationType, className.startsWith(type) ? 'INFO_ONLY': ''));
        break;
    }
    /* eslint-enable indent */
  });
}

function saveUpdatedCandidateData(event) {
  console.log("STEVE saveUpdatedCandidateData() ");
  const targetCand = event.currentTarget.className; // div.candidate.candidate-4
  const targetFurl = "#" + targetCand.replace('candidate candidate', 'furlable');
  const off = targetFurl.indexOf('-') + 1;
  const number = targetFurl.substring(off, off + 1);
  const buttons = $(targetFurl).find(":button");
  let stance = "DEFAULT";

  buttons.each((i, but) => {
    const className = but.className;   // "infoButton-2 weButton noStyleWe deselected"
    if (className.match(/endorse.*?selectedEndorsed/)) {
      stance = 'SUPPORT';
    } else if (className.match(/oppose.*?selectedOpposed/)) {
      stance = 'OPPOSED';
    } else if (className.match(/info.*?selectedInfo/)) {
      stance = 'INFO_ONLY';
    }
  });
  const comment = $('.endorseInput-' + number).val();
  const sourceURL = $('.sourceURL-' + number).val();
  // const voterGuidePossibilityId = $('#possibilityPositionId-' + number).val();
  // const possibilityPositionNumber = $('#possibilityPositionNumber-' + number).val();

  // voterGuidePossibilityPositionSave



  console.log("saveUpdatedCandidateData " + stance + ", " + number + ", '" + comment + "',  '" + sourceURL + "'");
}


function unfurlOnePositionPane(event) {
  const targetCand = event.currentTarget.className; // div.candidate.candidate-4
  const targetFurl = "#" + targetCand.replace('candidate candidate', 'furlable');
  let buttons = $(targetFurl).find(":button");
  console.log("unfurlOnePositionPane buttons: ", buttons);
  buttons.each((i, but) => {
    let className = but.className;
    console.log("STEVE     STEVE className: " + className );
    if (className.startsWith("endorse")) {
      $(but).click(() => {
        selectOneDeselectOthers("endorse", targetFurl)
      });
    }
    if (className.startsWith("oppose")) {
      $(but).click(() => {
        selectOneDeselectOthers("oppose", targetFurl)
      });
    }
    if (className.startsWith("info")) {
      $(but).click(() => {
        selectOneDeselectOthers("info", targetFurl)
      });
    }
    // Sept 11, 2019 -- this is the correct place for this, but i just couldn't get the click listner to work
    // if (className.startsWith("save")) {
    //   console.log("STEV STEV STEV before but.click      " + className);
    //   but.click( (event) => {
    //     console.log("BBBBBB SAVE clicked", event);
    //     saveUpdatedCandidateData(event);
    //   });
    // }
  });
  $(targetFurl).removeAttr('hidden');

}

function deactivateActivePositionPane() {
  const visibleElements = $('.furlable:visible');
  if (visibleElements.length > 0) {
    // console.log('deactivateActivePositionPane() visibleElements: ',visibleElements);
    let visibleElement = visibleElements[0];
    let visibleElementId = visibleElement.id;
    let buttons = $('#' + visibleElementId + ' :button');
    buttons.unbind();
    $('#' + visibleElementId).attr('hidden', true);
    console.log('deactivateActivePositionPane() buttons: ', buttons);
  } else {
    console.log('deactivateActivePositionPane() -- No open panes');
  }
}

function rightNewGuideDialog() {
  let selector = $("#sideArea");
  let markup = "<div id='newGuide'>" +
    "<h3>Store Organization Info<br>for this Guide</h3><br>" +
    "Organization Name:<br>" +
    "<input type='text' class='orgNameNew' name='orgName'><br>" +
    "Organization Twitter Handle:<br>" +
    "<input type='text' class='orgTwitterNew' name='orgTwitter'><br>" +
    "State Code (two letters)(optional):<br>" +
    "<input type='text' class='orgStateNew' name='orgState'><br>" +
    "Comments:<br>" +
    "<textarea  class='orgCommentsNew' name='orgComments'></textarea></textarea><br><br>" +
    "<input type='button' id='saveToServer' class='weButton noStyleWe' value='Save to Server'>" +
    "</div>";
  $(selector).append(markup);
  document.getElementById("saveToServer").addEventListener('click', function () {
    console.log("Save to Server pressed");
    saveNewOrgData();
    return false;
  });
}

function saveNewOrgData() {
  console.log("STEVE saveNewOrgData() ");
  let name = $('.orgNameNew').val();
  let twitter = $('.orgTwitterNew').val();
  let state = $('.orgStateNew').val();
  let comments = $('.orgCommentsNew').val();
  chrome.runtime.sendMessage(
    {
      command: "updateVoterGuide",
      voterGuidePossibilityId: possibilityIdGlobal,
      orgName: name,
      orgTwitter: twitter,
      orgState: state,
      comments: comments
    },
    function (response) {
      console.log("STEVE saveNewOrgData() response", response);

      if (response && Object.entries(response).length > 0) {
        const {orgName, comments} = response.data;  // eslint-disable-line no-unused-vars

        // $('#orgLogo').attr("src", orgLogo);
        $("#orgName").text(orgName);
        $("#topComment").val(comments);
        console.log("updateTopMenu orgName: " + orgName);
        if (orgName === undefined) {
          rightNewGuideDialog();
        } else {
          $('#newGuide').remove();
          updatePositionsPanel();
        }
      } else {
        console.log("ERROR: updateTopMenu received empty response");
      }
    });
}

// SVGs lifted from WebApp thumbs-up-color-icon.svg and thumbs-down-color-icon.svg
function supportButton(i, type, stance ) {
  let buttonText = '';
  let fillColor = '';
  let selectionStyle = '';
  let textClass = '';
  if (type === 'endorse') {
    buttonText = 'ENDORSED';
    textClass = 'supportButtonText';
    if (stance === "SUPPORT") {
      fillColor = 'white';
      selectionStyle = 'selectedEndorsed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else if (type === 'oppose') {
    buttonText = 'OPPOSED';
    textClass = 'supportButtonText';
    if (stance === "OPPOSE") {
      fillColor = 'white';
      selectionStyle = 'selectedOpposed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else {
    buttonText = 'INFO ONLY';
    textClass = 'supportButtonTextNoIcon';
    if (stance === "INFO_ONLY") {
      fillColor = 'white';
      selectionStyle = 'selectedInfo';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  }

  let markup = "<button type='button' class='" + type + "Button-" + i + " weButton noStyleWe " + selectionStyle + "'>";

  if (type === 'endorse' || type === 'oppose') {
    markup += "<svg class='supportButtonSVG' viewBox='0 0 24 24'>";

    if (type === 'endorse') {
      markup += "<path fill='" + fillColor + "' d='M6,16.8181818 L8.36363636,16.8181818 L8.36363636,9.72727273 L6,9.72727273 L6,16.8181818 L6,16.8181818 Z M19,10.3181818 C19,9.66818182 18.4681818,9.13636364 17.8181818,9.13636364 L14.0895455,9.13636364 L14.6509091,6.43590909 L14.6686364,6.24681818 C14.6686364,6.00454545 14.5681818,5.78 14.4086364,5.62045455 L13.7822727,5 L9.89409091,8.89409091 C9.67545455,9.10681818 9.54545455,9.40227273 9.54545455,9.72727273 L9.54545455,15.6363636 C9.54545455,16.2863636 10.0772727,16.8181818 10.7272727,16.8181818 L16.0454545,16.8181818 C16.5359091,16.8181818 16.9554545,16.5227273 17.1327273,16.0972727 L18.9172727,11.9313636 C18.9704545,11.7954545 19,11.6536364 19,11.5 L19,10.3713636 L18.9940909,10.3654545 L19,10.3181818 L19,10.3181818 Z'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    } else if (type === 'oppose') {
      markup += "<path fill='" + fillColor + "' d='M5,18.8199997 L7.36399994,18.8199997 L7.36399994,11.7279999 L5,11.7279999 L5,18.8199997 L5,18.8199997 Z M18.0019997,12.3189999 C18.0019997,11.6688999 17.4700997,11.1369999 16.8199997,11.1369999 L13.0907898,11.1369999 L13.6522398,8.43612996 L13.6699698,8.24700997 C13.6699698,8.00469997 13.5694998,7.78011998 13.4099298,7.62054998 L12.7834698,7 L8.8946899,10.8946899 C8.67601991,11.1074499 8.54599991,11.4029499 8.54599991,11.7279999 L8.54599991,17.6379997 C8.54599991,18.2880997 9.07789989,18.8199997 9.72799988,18.8199997 L15.0469997,18.8199997 C15.5375297,18.8199997 15.9571397,18.5244997 16.1344397,18.0989797 L17.9192597,13.9324298 C17.9724497,13.7964998 18.0019997,13.6546598 18.0019997,13.5009998 L18.0019997,12.3721899 L17.9960897,12.3662799 L18.0019997,12.3189999 L18.0019997,12.3189999 Z' transform='rotate(-180 11.501 12.91)'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    }

    markup += "</svg>";
  }

  markup += "<span class='" + textClass + "'>" + buttonText + "</span></button>";

  return markup;
}

function isParentFurlable (target) {
  if (target.classname === 'furlable') {
    return true;
  }
  let i = 0;
  let scan = target;
  while( scan && scan.id !== "sideArea" && scan.className !== 'furlable') {
    scan = scan.parentElement;
    if( i++ > 10 ) {
      break;
    }
  }
  return scan && (scan.className === 'furlable');
}

function attachClickHandlers () {
  //console.log("attachClickHandlers", $('div.candidate').length);

  $('div.candidate').click( (event) => {
    console.log("DDDDDD isParentFurlable ", isParentFurlable(event.target));
    if (!isParentFurlable(event.target)) {
      console.log("DDDDDD Candidate clicked #1", event);
      deactivateActivePositionPane();
      unfurlOnePositionPane(event);
      console.log("DDDDDD Candidate clicked #2", event);
    } else {
      // Sept 11, 2019 -- this is NOT the correct place for this, but i just couldn't get the click listner to work
      const className = event.target.className;
      if (className.startsWith("saveButton-")) {
        console.log("DDDDDD SAVE clicked: " + className);
        saveUpdatedCandidateData(event);
      } else {
        console.log("DDDDDD Candidate click IGNORED since target is in furlable area", event);
      }
    }
  });
}
