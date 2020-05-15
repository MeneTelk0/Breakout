#!/usr/bin/env python
import cgi
import psycopg2

conn = psycopg2.connect(dbname="mitla", user="mitla", password="root12", host="localhost")
cur = conn.cursor()

form = cgi.FieldStorage()
look_up_name = form.getlist("look_up_name")

#SQL-Query
    # SELECT * FROM
    # (SELECT row_number() OVER (order by score::int DESC) sid, name, score, date FROM rating ORDER BY score DESC) tmp
    # WHERE name = %s
    # ORDER BY sid::int;

cur.execute("select * from (SELECT row_number() over (order by score::int DESC) sid, name, score, date FROM rating ORDER BY score DESC) tmp where name = %s order by sid::int; ",(look_up_name))
results = cur.fetchall()
results_len = len(results)

print("""Content-type: text/html\n
       <!DOCTYPE HTML>
        <html>
        <head>
            <meta charset="utf-8">
            <title>BREAKOUT_GAME</title>
            <style>
                 body{
                    /* background-image: url("background.png"); */
                    background-color: #000000;
                }
            </style>
        </head>
        <body>
        <center>
            <h1 style=color:#FFFFFF>SCORES OF PLAYERS WITH NICKNAME '""" + str(" ".join(map(str, look_up_name))) + """'</h1>
        </body>
        </html>""")
if results_len > 0:
    print("""
	<p></p>
    <style type="text/css">
    .tg  {border-collapse:collapse;border-spacing:0;}
    .tg td{font-family:Arial, sans-serif;font-size:14px;padding:20px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:black;}
    .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:20px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:black;}
    .tg .tg-fbro{font-size:18px;font-family:serif !important;;color:#ffffff;border-color:#fe0000;text-align:center;vertical-align:top}
    .tg .tg-u559{font-size:18px;font-family:serif !important;;color:#ffffff;border-color:#fe0000;text-align:center}
    </style>
    <table class="tg" style="undefined; table-layout: fixed; width: 650px">
    <colgroup>
    <col style="width: 50px">
    <col style="width: 200px">
    <col style="width: 200px">
    <col style="width: 200px">
    </colgroup>
    <tr>
        <th class="tg-u559">Pos</th>
        <th class="tg-fbro">Nickname</th>
        <th class="tg-fbro">Score</th>
        <th class="tg-fbro">Date</th>
    </tr> """)
    if results_len > 1:
        for i in range(0, results_len):
            print("""
     <tr>
        <td class="tg-fbro">""" + str(results[i][0]) + """</td>
        <td class="tg-fbro">""" + str(results[i][1]) + """</td>
        <td class="tg-fbro">""" + str(results[i][2]) + """</td>
        <td class="tg-fbro">""" + str(results[i][3]) + """</td>
    </tr> """)
    elif results_len == 1:
        print("""
     <tr>
        <td class="tg-fbro">""" + str(results[0][0]) + """</td>
        <td class="tg-fbro">""" + str(results[0][1]) + """</td>
        <td class="tg-fbro">""" + str(results[0][2]) + """</td>
        <td class="tg-fbro">""" + str(results[0][3]) + """</td>
    </tr> """)
    print(""" </table>
    <br></br>""")
else: 
    print(""" <h3 style=color:#FFFFFF> No results of players with this nickname</h3> """)

print("""
    <form action='/cgi-bin/view_menu.py'> 
    <button type='submit'> Back to Rating </button> 
    </form>
    <br></br>
    <form>
        <input type="button" value="Return to the Main page" onClick='location.href="http://localhost:8000/index.html"'>
        </form>
    </center>""")

conn.commit()
cur.close()
conn.close()