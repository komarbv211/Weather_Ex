document.addEventListener('DOMContentLoaded', function() {
    let latitude, longitude;
    const cityInput = document.getElementById('cityInput');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            fetchWeatherData(latitude, longitude);
            // Оновлення placeholder з назвою міста, отриманою з геолокації
            fetchCityName(latitude, longitude)
                .then(city => {
                    cityInput.placeholder = city;
                })
                .catch(error => {
                    console.error('Помилка при отриманні назви міста:', error);
                });
        }, function(error) {
            console.error('Помилка отримання місця розташування:', error);
            fetchWeatherDataByCity('Київ');
            cityInput.placeholder = 'Київ'; 
        });
    } else {
        fetchWeatherDataByCity('Київ');
        cityInput.placeholder = 'Київ'; 
    }

    // Додавання події на форму для обробки пошуку
    document.getElementById('searchButton').addEventListener('click', function(event) {
        event.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherDataByCity(city);
        } else {
            alert('Введіть назву міста.');
        }
    });
});

function fetchWeatherData(lat, lon) {
    const apiKey = '4ee3a5ebbe8bd78c1bb4771e09ba1374';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=uk`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=uk`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayTodayWeather(data);
            fetchNearbyCities(data.coord.lat, data.coord.lon);
        })
        .catch(error => console.error('Помилка при отриманні даних про поточну погоду:', error));

    fetch(forecastUrl)
        .then(response => response.json())
        .then(data => {
            displayForecastWeather(data);
        })
        .catch(error => console.error('Помилка при отриманні даних про прогноз погоди:', error));
}

function fetchWeatherDataByCity(city) {
    const apiKey = '4ee3a5ebbe8bd78c1bb4771e09ba1374';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=uk`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=uk`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.cod === 200) {
                displayTodayWeather(data);
                fetchNearbyCities(data.coord.lat, data.coord.lon);
                fetch(forecastUrl)
                    .then(response => response.json())
                    .then(forecastData => {
                        displayForecastWeather(forecastData);
                    });
                cityInput.placeholder = city;

                // Hide the error image if data is successfully fetched
                document.getElementById('error').classList.remove('error404');

                // Show the weather tabs content
                document.getElementById('weatherTabsContent').style.display = 'block';
            } else {
                // Show the error image if city is not found
                document.getElementById('error').classList.add('error404');

                // Hide the weather tabs content
                document.getElementById('weatherTabsContent').style.display = 'none';
            }
        })
        .catch(error => console.error('Помилка при отриманні даних про погоду по місту:', error));
}

async function fetchCityName(lat, lon) {
    const apiKey = '4ee3a5ebbe8bd78c1bb4771e09ba1374';
    const reverseGeocodeUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=uk`;

    try {
        const response = await fetch(reverseGeocodeUrl);
        const data = await response.json();
        if (data.cod === 200) {
            return data.name;
        } else {
            throw new Error('Назва міста не знайдена');
        }
    } catch (error) {
        throw new Error('Не вдалося отримати назву міста');
    }
}

function displayTodayWeather(data) {
    const formattedData = {
        name: data.name,
        date: new Date(data.dt * 1000).toLocaleDateString('uk-UA'),
        description: data.weather[0].description,
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        icon: data.weather[0].icon,
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('uk-UA'),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('uk-UA'),
        dayLength: ((data.sys.sunset - data.sys.sunrise) / 3600).toFixed(2)
    };

    const extendedData = createExtendedData(formattedData, data);

    setTimeout(() => {
        var source = document.getElementById('weather-template');
        if (source) {
            var template = Handlebars.compile(source.innerHTML);
            var html = template(formattedData);
            document.getElementById('todayWeather').innerHTML = html;
            displayExtendedForecast(extendedData, new Date(data.dt * 1000).toISOString().split('T')[0], 'hourly-weather');
        } else {
            console.error('Елемент з ID "weather-template" не знайдено.');
        }
    }, 0);
}

function createExtendedData(formattedData, data) {
    function createTimeData(baseTemp, baseFeelsLike, baseHumidity, basePressure, baseWindSpeed, timeOffset) {
        return {
            dt_txt: new Date(data.dt * 1000).toISOString().split('T')[0] + ` ${timeOffset}:00:00`,
            main: {
                temp: baseTemp,
                feels_like: baseFeelsLike,
                humidity: baseHumidity,
                pressure: basePressure
            },
            weather: [
                {
                    description: formattedData.description,
                    icon: formattedData.icon
                }
            ],
            wind: {
                speed: baseWindSpeed
            }
        };
    }

    // Отримуємо поточну дату і години
    const currentDate = new Date();
    const currentHours = currentDate.getHours();

    // Формуємо timeOffsets від поточного часу до кінця доби
    const timeOffsets = [];
    for (let i = currentHours; i < 24; i += 3) {
        timeOffsets.push(i.toString().padStart(2, '0'));
    }

    const extendedList = timeOffsets.map((offset, index) => {
        return createTimeData(
            formattedData.temp + index,
            formattedData.feels_like + index,
            data.main.humidity + index,
            data.main.pressure + index,
            data.wind.speed + index,
            offset
        );
    });

    return {
        list: extendedList
    };
}
function displayForecastWeather(data) {
    let forecastHTML = `<div class="col forecast"><div class="row">`;

    const groupedData = data.list.reduce((acc, curr) => {
        const date = curr.dt_txt.split(' ')[0];
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(curr);
        return acc;
    }, {});

    Object.keys(groupedData).forEach((date, index) => {
        if (index < 5) {
            const dayData = groupedData[date][0];
            forecastHTML += `
                <div class="col day-forecast" data-date="${date}">
                    <h4>${new Date(date).toLocaleDateString('uk-UA', { weekday: 'long' })}</h4>
                    <p>${new Date(date).toLocaleDateString('uk-UA')}</p>
                    <img src="http://openweathermap.org/img/wn/${dayData.weather[0].icon}.png" class="weather-icon" alt="Weather icon">
                    <p>Температура: ${dayData.main.temp}°C</p>
                    <p>Опис: ${dayData.weather[0].description}</p>
                </div>
            `;
        }
    });

    forecastHTML += '</div><div id="extendedForecastWeather" class="row"></div></div>';
    document.getElementById('forecastWeather').innerHTML = forecastHTML;

    document.querySelectorAll('.day-forecast').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.day-forecast').forEach(el => el.classList.remove('selected-day'));
            const date = this.getAttribute('data-date');
            this.classList.add('selected-day');
            displayExtendedForecast(data, date, 'extendedForecastWeather');
        });
    });
}

function fetchNearbyCities(lat, lon) {
    const apiKey = '4ee3a5ebbe8bd78c1bb4771e09ba1374';
    const url = `https://api.openweathermap.org/data/2.5/find?lat=${lat}&lon=${lon}&cnt=5&appid=${apiKey}&units=metric&lang=uk`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayNearbyCities(data);
        })
        .catch(error => console.error('Помилка при отриманні даних про найближчі міста:', error));
}

function displayNearbyCities(data) {
    let nearbyCitiesHTML = '<h3>Найближчі міста</h3><div class="row">';

    data.list.forEach(city => {
        nearbyCitiesHTML += `
            <div class="col-md-2">
                <p>${city.name}</p>
                <img src="http://openweathermap.org/img/wn/${city.weather[0].icon}.png" class="weather-icon" alt="Weather icon">
                <p>${city.main.temp}°C</p>
            </div>
        `;
    });

    nearbyCitiesHTML += '</div>';
    document.getElementById('nearbyCities').innerHTML = nearbyCitiesHTML;
}

function displayExtendedForecast(data, date, nameId) {
    const dayData = data.list.filter(item => item.dt_txt.startsWith(date)).map(item => ({
        time: new Date(item.dt_txt).toLocaleTimeString('uk-UA', { hour: 'numeric', minute: 'numeric' }),
        temp: item.main.temp,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind.speed
    }));

    setTimeout(() => {
        var source = document.getElementById('extended-forecast');
        if (source) {
            var template = Handlebars.compile(source.innerHTML);
            var html = template(dayData);
            document.getElementById(nameId).innerHTML = html;
        } else {
            console.error('Елемент з ID "extended-forecast" не знайдено.');
        }
    }, 0);
}
