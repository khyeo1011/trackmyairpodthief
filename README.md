# Track My Airpod Thief
> I'm gonna find my Airpods back I swear 

This repo contains the scripts necessary to ~~stalk~~ track the thief that stole your apple devices Utilizing Apple's Find My and store them so that you can possibly confront them by analyzing their typical day-to-day behavior. At this point this is a POC, and hasn't really been tested.

> [!IMPORTANT] 
> Please do not approach thiefs to confront them. It is possibly dangerous and carries legal risks. Please contact your local police authority and if you do choose to confront them, please do so in a public space with lots of people.

## Requirements & Steps
- Python 3.12.*
- Mac device running MacOS 14 (Can be VM)
  - You can have a newer MacOS version, but you would have to find a way to dump the encryption keys. See also: https://docs.mikealmel.ooo/FindMy.py/getstarted/02-fetching.html
- SQLite3
- An apple account connected to your device.
- A computer that you can keep running

Start by creating a virtual environment by 
```
python3 -m venv .venv
source .venv/bin/activate
```
Install requirements 
```
pip install -r requirements.txt
```
Then run 
```
python3 tracker.py
```
After logging in, you might have to run (one time thing; must be done in a Mac computer)
```
python3 -m findmy decrypt --out-dir devices/
```


## Feautures
- [ ] Create Logic for Fetching Data and Storing into a Database
- [ ] Create a GUI to map out the location and paths the thief took
- [ ] Create a model that given the time of the day and the day of the week, predicts the thiefs location.