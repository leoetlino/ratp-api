# ratp-api

A modern API to get information from the RATP

## Requirements
- Node.js (at least 0.10)
- The RATP database extracted from the Android app

## Setup

Clone the repo and then install the npm modules
(as well as bunyan, used for logs):

```
git clone git@github.com:leoetlino/ratp-api
cd ratp-api
sudo npm -g install bunyan
npm install
```

Copy the sqlite3 database extracted from the RATP official Android app
into the application root dir.
The database is not bundled to prevent legal issues.

You can do this with `adb` and root access:

```
adb pull /data/data/com.fabernovel.ratp/databases/ratp.db ./source/
```

Alternatively, you can extract the database file from the APK
(which is just a special ZIP file).

Finally, start the app:

```
node bootstrap.js | bunyan -o short -L
```

## API documentation

The API is [documented in the wiki](https://github.com/leoetlino/ratp-api/wiki/API).

## Why a RATP API?

While the RATP has released some of their data, the official API is
pretty complex for basic, most useful endpoints, such as getting a list of
all stations, network-wide or on a specific line.

And then there's the **refusal** to make the real-time next stops API
and data from the [SIEL](https://fr.wikipedia.org/wiki/SIEL_(m%C3%A9tro_de_Paris)) available
publicly. It even goes as far as threatening developers with legal action…

This is for data that is supposed to be public, and
that is already available to the public. **Why?**

Given that web scraping is forbidden, ratp-api does not rely on the website,
but instead directly uses the API that powers the Android app.
No reverse engineering was performed on the APK file.
Only traffic sniffing was done on my own device and my own network.

Since I wanted a modern JSON API and there was none, I decided to
make my own and release it under an open-source license.

## Contributing

Pull requests are welcome. When contributing code, make sure to follow
the existing code style and write clear commit messages.

## Disclaimer

This software is only provided to make using the API and the
database easier; as such, it is *your* responsability to make sure
you are authorised to legally use the RATP API and the database.
I cannot be held liable if you use this software improperly,
violate any terms of service, or infringe copyright laws.

This project is not affiliated with and/or endorsed by the [RATP](http://www.ratp.fr).

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.
