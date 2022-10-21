<%
Dim name, age
name = Request.QueryString("Name")
age = Request.QueryString("Age")
Response.Write("Name: " & name & "<br />")
Response.Write("Age: " & age & "<br />")
%>