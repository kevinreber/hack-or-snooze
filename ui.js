$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $('#favorited-articles');
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    const hostName = getHostName(story.url);
    const starType = usersFavoriteIds(story.storyId)
    const trashIcon = isUsersStory(story.storyId) ? `
    <span class="trash-can">
      <i class="fas fa-trash-alt"></i>
    </span>` : "";

    // render story markup
    // $(`<html></html>`) builds a jQuery object
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trashIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup; // Returns a jQuery object
  }

  // Checks if story is user's story
  function isUsersStory(storyId) {
    const storyList = [];
    for (let stories of currentUser.ownStories) {
      storyList.push(stories.storyId);
    }
    return storyList.includes(storyId) ? true : false;
  }

  // Handle when user deletes story from Story List
  $('body').on('click', '.trash-can', deleteUserStory);

  async function deleteUserStory() {
    const storyId = $(this).closest('li').attr('id');
    await storyList.deleteStory(currentUser, storyId); // await to wait for updated API

    // Update story list
    await generateStories();

    // Hide all elements but story list
    hideElements();
    $allStoriesList.show();
  }

  // Returns star type if story is favorited by user
  function usersFavoriteIds(storyId) {
    const idList = [];
    for (let favorite of currentUser.favorites) {
      idList.push(favorite.storyId);
    }
    return idList.includes(storyId) ? 'fas' : 'far';
  }

  // Handle when user favorites article
  $('body').on('click', '.fa-star', toggleFavorites);

  // Toggle star for user's favorites
  function toggleFavorites(e) {
    $(this).toggleClass('far fas');

    // Update API of users favorites
    const classList = e.target.classList;
    const storyId = $(this).closest('li').attr('id');

    if (classList.contains('far')) {
      currentUser.updateFavorites(storyId, "DELETE");
    }
    if (classList.contains('fas')) {
      currentUser.updateFavorites(storyId, "POST"); //currentUser.updateFavorites b/c each user has their own functions
    }
  }

  // Event handler when user wants to see favorites
  $('#nav-favorites').on('click', function () {
    // Hide all elements
    hideElements();

    // If user is logged in generate and show user's favorites
    if (currentUser) {
      generateFavorites();
      $favoritedArticles.show();
    };
  });

  // Display favorites
  function generateFavorites() {
    // Clear favorite articles
    $favoritedArticles.empty();

    // If User doesn't have any favorite articles
    if (currentUser.favorites.length === 0) {
      $favoritedArticles.append(`<h3>No favorited articles!</h3>`);
    } else {
      for (favorite of currentUser.favorites) {
        let html = generateStoryHTML(favorite);
        $favoritedArticles.append(html);
      }
    }
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  // Toggle submit form
  $('#nav-submit').on('click', () => {
    // $submitForm.toggleClass('hidden');
    $submitForm.slideDown("slow");
  });

  // Handles User's submitted story
  $submitForm.on('submit', async function (e) {
    e.preventDefault();

    const title = $('#title').val();
    const author = $('#author').val();
    const url = $('#url').val();
    const username = currentUser.username;

    const story = {
      title,
      author,
      url,
      username
    };

    // Adds story to API
    const storyObject = await storyList.addStory(currentUser, story);

    // Generates html to add to story list
    const html = generateStoryHTML(storyObject);
    $allStoriesList.prepend(html);

    // Reset form
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  });

  // Toggles what User can see when logged in
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $('#user-profile').hide(); // Hide user-profile on log in
    $('.main-nav-links').toggleClass('hidden'); // Toggles links when user logs in
    const html = $(`<small>${currentUser.username} (logout)</small>`);
    $navLogOut.append(html).show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});