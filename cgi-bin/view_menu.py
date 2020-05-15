#!/usr/bin/env python
import cgi
import psycopg2


conn = psycopg2.connect(dbname="mitla", user="mitla", password="root12", host="localhost")
cur = conn.cursor()


cur.execute('SELECT * FROM rating order by score::int DESC;')
results = cur.fetchall()
results_len = len(results)
i = 0

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
    <br></br>
     <center> <h1 style=color:#FFFFFF >RATING</h1> 
     </center> 
    <center>
        <h4 style=color:#FFFFFF> LOOK UP FOR YOUR SCORE </h4>
                <form action="/cgi-bin/look_up_score.py">
                    <input type="text" placeholder="Nickname" name="look_up_name" maxlength="20">
                    <button>Search</button>
                </form>
            <br></br>
            <form>
                <input type="button" value="Return to the Main page" onClick='location.href="http://localhost:8000/index.html"'>
            </form>
            <br></br>
    </center>

<center> 
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
for i in range(0, results_len):
  print("""
     <tr>
        <td class="tg-fbro">""" + str(i+1) + """</td>
        <td class="tg-fbro">""" + str(results[i][1]) + """</td>
        <td class="tg-fbro">""" + str(results[i][2]) + """</td>
        <td class="tg-fbro">""" + str(results[i][3]) + """</td>
    </tr> """)
print("""
    </table>
	<p></p>
	<form>
        <input type="button" value="Return to the Main page" onClick='location.href="http://localhost:8000/index.html"'>
    </form>
</center>

</body>
</html> """)


conn.commit()
cur.close()
conn.close()