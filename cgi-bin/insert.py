#!/usr/bin/env python
import cgi
import psycopg2


conn = psycopg2.connect(dbname="mitla", user="mitla", password="root12", host="localhost")
cur = conn.cursor()

form = cgi.FieldStorage()
name = form.getlist("name")
score = form.getlist("score")

print("""Content-type: text/html\n
       <!DOCTYPE HTML>
        <html>
        <head>
            <meta charset="utf-8">
            <title>BREAKOUT_GAME</title>
	<style>
    body {background-color: #000000}
  </style>
        </head>
	<div class="center">
        <body>
        <p> SUPER GAME</p>
            <center> <h1 style=color:#FFFFFF >Successfully submitted! </h1>
	<p></p>
        </center>
	</div>
        <center> 
                <form action='/cgi-bin/view_menu.py'> 
                <button type='submit'> Back to Rating </button> 
                 </form>
                <br></br>
                <form>
                <input type="button" value="Main Menu" onClick='location.href="http://localhost:8000/index.html"'>
                </form>
        </center>
        </body>
        </html>""")

cur.execute('insert into rating(name, score, date) values ( %s, %s, now());', (" ".join(map(str, name)), " ".join(map(str, score))))

conn.commit()
cur.close()
conn.close()
