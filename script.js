'use strict';

/* Elements*/
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
/* --------------------------------------------------------------------------------------- */

// Global variable
let map;
let mapEvent;

// Classes

// Workout Class
class Workout {

    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;


    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in KM
        this.duration = duration; // In Min
    }

    setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click() {
        this.clicks++;
    }
}

// Running Child Class
class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcpace();
        this.setDescription();
    }

    calcpace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

// Cycling Child Class
class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this.setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// App Class
class App {

    map;
    mapZoomLevel = 15;
    mapEvent;
    workouts = [];

    constructor() {
        // Load the map
        this._getPosition();
        // Get data from local storage
        this._getLocalStorage();
        // Form 
        form.addEventListener('submit', this._newWorkout.bind(this));
        // Toggling Cycling and Running Classes
        inputType.addEventListener('change', this._toggleElevationField);
        // Adding event listner to the workout containers
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your position');
            });
        }
    }

    _loadMap(position) {
        const {
            latitude
        } = position.coords;
        const {
            longitude
        } = position.coords;

        const coords = [latitude, longitude];

        // L is the internal object of the Leaflet Library
        this.map = L.map('map').setView(coords, this.mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Handling clicks on map
        this.map.on('click', this._showForm.bind(this));

        // Load the markers at the map of the previous data
        this.workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });

    }

    _showForm(mapE) {
        this.mapEvent = mapE;
        // making form visible when clicked on the map
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Empty the inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";

        // To replace the form with activity
        // Make form display none as to avoid transition
        form.style.display = 'none';
        // Make now form hidded 
        form.classList.add('hidden');
        // Bring back the original display to have a clear transition
        setTimeout(() => (form.style.display = 'grid'), 1000)

    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        // Helper functions
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        // 1 -> Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {
            lat,
            lng
        } = this.mapEvent.latlng;
        let workout;

        // 2 -> Type checking
        // 2A If workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('Inputs have to be a positive numbers!');

            workout = new Running([lat, lng], distance, duration, cadence);

        }
        // 2B If workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('Inputs have to be a positive numbers!');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }


        // 3 -> Add new object to workout Array
        this.workouts.push(workout);

        // 4 -> Render workout on map as marker
        this._renderWorkoutMarker(workout);

        // 5 -> Render workout on list
        this._renderWorkout(workout);

        // 6 -> Hide the form + clear input fields
        this._hideForm();

        // 7 -> Set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if (workout.type === 'running')
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

        if (workout.type === 'cycling')
            html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">m</span>
        </div>
        </li>`;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        console.log(workoutEl);
        const workout = this.workouts.find(work => work.id === workoutEl.dataset.id);
        console.log(workout);
        // In-Build library function
        this.map.setView(workout.coords, this.mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

        // Using the public interface
        // workout.click();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.workouts = data;

        this.workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

}

// Creating an object instance
const app = new App();