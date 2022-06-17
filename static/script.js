let resources;
let currentIndex = 0;
let maxIndex = 0;

// Initialize the slideshow
window.onload = () => {
    loadAvailableImages();
    loadWeatherInformation();

    // Reload page every hour
    setInterval(() => location.reload(), 3600000);
};

/// Checks if the weather information should be shown, if so load them
function loadWeatherInformation() {
    fetch(`${window.location.href}api/weather`)
        .then(response => response.json())
        .then(showWeather => {
            if (showWeather === true) {
                loadCurrentWeather();
            }
        });
}

// Shows the current weather on the slideshow
function loadCurrentWeather() {
    fetch(`${window.location.href}api/weather/current`)
        .then(response => response.json())
        .then(data => {
            showCurrentWeather(data);
        });
}

// Shows the current weather on the slideshow
function showCurrentWeather(data) {
    const weather = data.weather[0];
    const icon = weather.icon;

    document.getElementById("weather-label").innerHTML = weather.description + ",&nbsp;";
    document.getElementById("weather-icon").src = `https://openweathermap.org/img/w/${icon}.png`;

    if (isHomeAssistantEnabled()) {
        let homeAssistantData = JSON.parse(getCurrentTemperatureDataFromHomeAssistant());
        document.getElementById("weather-temperature").innerText =
            Math.round(homeAssistantData.state) + homeAssistantData.attributes.unit_of_measurement;
    } else {
        document.getElementById("weather-temperature").innerText =
            Math.round(data.main.temp) + "°C";
    }
}

// Returns true if Home Assistant is enabled
function isHomeAssistantEnabled() {
    let request = new XMLHttpRequest();
    request.open('GET', `${window.location.href}api/weather/homeassistant`, false);
    request.send(null);
    if (request.status === 200) {
        return String(request.responseText) === "true";
    }

    return false;
}

// Loads the current temperature from Home Assistant
function getCurrentTemperatureDataFromHomeAssistant() {
    let request = new XMLHttpRequest();
    request.open('GET', `${window.location.href}api/weather/homeassistant/temperature`, false);
    request.send(null);
    if (request.status === 200) {
        return request.response;
    }
}

// Sets the image and its meta information
function setImage(resource_id) {
    // build the image url
    let imageUrl = `${window.location.href}api/resources/${resource_id}/${window.screen.availWidth}/${window.screen.availHeight}`;

    // obtain the image elements
    let backgroundImage = document.getElementById('background-image');
    let slideshowImage = document.getElementById("slideshow-image");
    let slideShowMetadata = document.getElementById("slideshow-metadata");

    // start the fade out animation
    backgroundImage.classList.add("fade-out");
    slideshowImage.classList.add("fade-out");
    slideShowMetadata.classList.add("fade-out");

    // wait for the fade out animation to end
    sleep(1000).then(() => {

        // when the image is loaded, start the fade in animation
        slideshowImage.onload = () => {
            // fade images in
            backgroundImage.classList.add("fade-in");
            backgroundImage.classList.remove("fade-out");

            slideshowImage.classList.add("fade-in");
            slideshowImage.classList.remove("fade-out");

            slideShowMetadata.classList.add("fade-in");
            slideShowMetadata.classList.remove("fade-out");

            // wait for the fade in animation to end
            sleep(1000).then(() => {
                backgroundImage.classList.remove("fade-in");
                slideshowImage.classList.remove("fade-in");
                slideShowMetadata.classList.remove("fade-in");
            });
        }

        // set image and blurred background image
        backgroundImage.style.backgroundImage = `url(${imageUrl})`;
        slideshowImage.src = imageUrl;

        // set image description but fade in is done simultaneously with the fade in of the image, see above
        let photoMetadataRequest = new XMLHttpRequest();
        photoMetadataRequest.open("GET", window.location.href + "api/resources/" + resource_id + "/description");
        photoMetadataRequest.send();
        photoMetadataRequest.onload = () => slideShowMetadata.innerText = photoMetadataRequest.response;
    })
}

// Returns a random resource
function getRandomResource() {
    let request = new XMLHttpRequest();
    request.open('GET', `${window.location.href}api/resources/random`, false);
    request.send(null);
    if (request.status === 200) {
        return JSON.parse(request.response);
    }
}

// Set the slideshow image and its meta information on tick interval
function slideshowTick() {
    if (resources.length === 0) {
        setImage(getRandomResource());
        return;
    }

    setImage(resources[currentIndex]);

    currentIndex++;
    if (currentIndex > maxIndex) {
        currentIndex = 0;
    }
}

// Returns the slideshow interval in seconds
function getSlideshowInterval() {
    let request = new XMLHttpRequest();
    request.open('GET', `${window.location.href}api/config/interval`, false);
    request.send(null);
    if (request.status === 200) {
        return request.responseText;
    }
    return 30;
}

// Starts the slideshow
function startSlideshow(response) {
    resources = response;

    maxIndex = Object.keys(resources).length - 1;
    slideshowTick();

    // Load slideshow interval
    let intervalInSeconds = getSlideshowInterval();

    // Start image slideshow
    setInterval(() => slideshowTick(), intervalInSeconds * 1000);
}

// Loads the available images from the server
function loadAvailableImages() {
    // load all images of this week in the past years
    const http = new XMLHttpRequest();
    http.open("GET", window.location.href + "api/resources/week");
    http.send();
    http.responseType = "json"
    http.onload = () => startSlideshow(http.response);
}

// Sleeps for the given amount of milliseconds
function sleep(ms) {
    return new Promise(resolver => setTimeout(resolver, ms));
}