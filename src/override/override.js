/*
  Bravado v0.0.0
*/

// Define global funcs
function findDaylight(lat, lng) {
  return new Promise(function(resolve, reject) {
    let request = new XMLHttpRequest()
    request.open('GET', `http://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`)
    request.responseType = 'json'

    request.onload = function() {
      if (request.status === 200) {
        resolve(request.response)
      } else {
        reject(Error('Couldn\'t find daylight; error code:' + request.statusText))
      }
    };

    request.onerror = function() {
        reject(Error('Couldn\'t find daylight. There was a network error.'))
    };

    request.send()
  });
}

function findDaylightAndAct(now, lat, lng, storeKey) {
  findDaylight(lat, lng)
  .then(res => res.results)
  .then(daylight => {
    const ONE_HOUR = 60 * 60 * 1000
    // Add an hour to our sunrise/set times because of ambient daylight
    let sunrise = new Date(new Date(daylight.sunrise) + ONE_HOUR)
    let sunset = new Date(new Date(daylight.sunset) + ONE_HOUR)

    if(now < sunrise || now > sunset) {
      toggleDaylight(false, true, storeKey)
    } else {
      toggleDaylight(true, true, storeKey)
    }
  })
}

function toggleDaylight(isLight, update, storeKey) {
  let d = document.documentElement

  if(isLight) {
    d.classList.remove('night')
  } else {
    d.classList.add('night')
  }

  if(update) {
    readStore(storeKey, d => {
      updateStore(storeKey, Object.assign({
        "isNight": !isLight,
      }, d))
    })
  }
}

function updateStore(storeKey, data) {
  let obj = {}
      obj[storeKey] = JSON.stringify(data)
  chrome.storage.sync.set(obj)
}

function readStore(storeKey,cb) {
  chrome.storage.sync.get(storeKey, result => {
    let d = null

    if(result[storeKey])
      d = JSON.parse(result[storeKey])

    // Make sure we got an object back, run callback
    if( typeof(d) === 'object' )
      cb(d)
  });
}

function init(data) {
  toggleDaylight(!data.isNight)
}

// Set up constants
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const months = ['January', 'February', 'March', 'April',
                'May', 'June', 'July', 'August',
                'September', 'October', 'November', 'December']

const key = 'rhugtkeldibnridrlerlgcrrdvneevit'

// Set up the store for our data
// We want to track the notepad's contents and whether or not the human's current
// location is in darkness.
let defaultData = {
  "notepadContent": "",
  "isNight": false,
  "location": {
    "lat": null,
    "lng": null,
  },
}

// >= v0.0.3 uses an object to store notepad content
// >= v1.1.2 uses chrome sync to store notepad content
// provide a fallback for older versions
readStore(key, d => {
  let data

  // Check if we got data from the chrome sync storage, if so, no fallback is needed
  if(d) {
    data = d
    console.log(data)
    
    let itemsList = document.querySelector('#itemsList');

    for (var i=0;i<data.content.length;i++) {

      let container = document.createElement('div');

      let input = document.createElement('input');
      let label = document.createElement('label');
      input.setAttribute('type', 'checkbox');
      label.innerText = ' ' + data.content[i];
      label.setAttribute('class', 'item');
      container.appendChild(input);
      container.appendChild(label);

      itemsList.appendChild(container)
      console.log(data.content[i])
    }
  }
  else
  {
    // Get the local storage
    local = localStorage.getItem(key)

    // Check if we got local storage data
    if(local) {
      // Try parsing the local storage data as JSON.
      // If it succeeds, we had an object in local storage
      try {
        data = JSON.parse(local)
        updateStore(key,local)
      }
      // If it fails to parse, we had the notepad content in local storage
      catch(e) {
        data = defaultData
        data.notepadContent = localStorage.getItem(key)
        updateStore(key, data)
      }

      // Delete the local storage
      localStorage.removeItem(key)
    }

    // If we couldn't get data from anywhere, set to default data
    if( ! data ) {
      data = defaultData
    }
  }

  start(data)
})

function listenerUpdate() {
  readStore(key, d => {
    document.querySelector('.notepad').innerHTML = d.notepadContent
  })
}

function start(data) {
  // Greet the human
  let now = new Date()
  let timeString = `${weekdays[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
  let broadTime = now.getHours() < 12 ?
                  'morning' :
                  now.getHours() > 17 ?
                  'evening' : 'afternoon'

  let g = document.querySelector('.greeting')
  // g.innerHTML = `Good ${broadTime}. It is ${timeString}.`
  g.innerHTML = `What would you like to accomplish today?`

  let d = document.querySelector('.date')
  d.innerHTML = timeString

  // Set up the notepad
  let n = document.querySelector('.notepad')
  n.innerHTML = data["notepadContent"]

  n.addEventListener('input', e => {
    if(n !== document.activeElement || !windowIsActive) return

    let obj = Object.assign(data, {
      notepadContent: n.value
    })

    updateStore(key, obj)
  })

  // Set up the input field
  let f = document.querySelector('#field');

  f.addEventListener('keyup', e => {
    // Enter key is pressed
    if (e.keyCode == 13) {
      let itemsList = document.getElementById('itemsList');
      let container = document.createElement('div');

      let strippedValue = field.value.replace('.','');
      let input = document.createElement('input');
      let label = document.createElement('label');
      input.setAttribute('type', 'checkbox');
      label.innerText = ' ' + strippedValue;
      label.setAttribute('class', 'item');
      container.appendChild(input);
      container.appendChild(label);

      itemsList.appendChild(container)


      taskList = document.querySelector('#itemsList').childNodes;

      let items = []

      for (var i=0;i<taskList.length;i++) {
        items.push(taskList[i].querySelector('label').innerText);
      }


      let obj = Object.assign(data, {
        content: items
      })
  
      updateStore(key, obj)
    }
  })
  // f.onkeypress = function(e){
  //   // Enter key is pressed
  //   if (e.keyCode == 13) {

  //     let obj = Object.assign(data, {
  //       content: {
  //         'task': f.value
  //       }
  //     })
  
  //     updateStore(key, obj)
  //   }
  // }

  // Allow updating content between tabs
  let windowIsActive

  let storeListener = setInterval(listenerUpdate, 1000)

  window.onfocus = function () {
    windowIsActive = true
  }

  window.onblur = function () {
    windowIsActive = false
    if(storeListener) {
      clearInterval(storeListener)
    }
    storeListener = setInterval(listenerUpdate, 1000)
  }

  n.addEventListener('blur', e => {
    if(storeListener) {
      clearInterval(storeListener)
    }
    storeListener = setInterval(listenerUpdate, 1000)
  })

  n.addEventListener('focus', e => {
    if(storeListener) {
      clearInterval(storeListener)
    }
  })

  // Initialise the view
  init(data)

  // Find the human's location and detect sunlight if necessary
  if("geolocation" in navigator) {
    if(data.location && data.location.lat !== null && data.location.lng !== null) {
      findDaylightAndAct(now, data.location.lat, data.location.lng, key)
    } else {
      navigator.geolocation.getCurrentPosition(position => {
        data.location = {
          "lat": position.coords.latitude,
          "lng": position.coords.longitude,
        }

        updateStore(key, data)

        findDaylightAndAct(now, data.location.lat, data.location.lng, key)
      })
    }
  }
}


// Find the input element
let field = document.getElementById('field');
let notes = document.getElementById('notes');
let strippedValue = '';

document.body.addEventListener('keyup', function(e){
  // Enter key is pressed
  if (e.keyCode == 13) {
    let itemsList = document.getElementById('itemsList');
    let container = document.createElement('div');

    // strippedValue = field.value.replace('.','');
    // let input = document.createElement('input');
    // let label = document.createElement('label');
    // input.setAttribute('type', 'checkbox');
    // label.innerText = ' ' + strippedValue;
    // label.setAttribute('class', 'item');
    // container.appendChild(input);
    // container.appendChild(label);

    // Tasks
    if (field.value.startsWith('.')) {
      strippedValue = field.value.replace('.','');
      let input = document.createElement('input');
      let label = document.createElement('label');
      input.setAttribute('type', 'checkbox');
      label.innerText = ' ' + strippedValue;
      label.setAttribute('class', 'item');
      container.appendChild(input);
      container.appendChild(label);
    }
    // Events
    // Notes
    else if (field.value.startsWith('-')) {
      strippedValue = field.value.replace('-','');
      let p = document.createElement('p');
      p.innerText = '\u2014 ' + strippedValue;
      p.setAttribute('class','item')
      itemsList.appendChild(p)
    }
    // Signifier (Priority/Inspiration)
    else if (field.value.startsWith('!')) {
      strippedValue = field.value.replace('!','');
      let p = document.createElement('p');
      p.innerText = strippedValue;
      itemsList.appendChild(p);
    }
    else if (field.value == '') {
      return false;
    }
    else {
      // let p = document.createElement('p');
      // p.innerText = field.value;
      // itemsList.appendChild(p);
    }


    // itemsList.appendChild(container)

    field.value = ''
    field.focus();
  }
});

// text-decoration: line-through;