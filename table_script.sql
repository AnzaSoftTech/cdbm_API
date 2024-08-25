CREATE TABLE cdbm.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL
);

CREATE TABLE cdbm.projects (
  id SERIAL PRIMARY KEY,
  projectname VARCHAR(100) UNIQUE NOT NULL,
  startdate timestamp(0) NOT NULL,
  status VARCHAR(50) NOT NULL
);


insert into cdbm.projects(projectname,startdate,status) values('project1',current_timestamp,'initialized');
insert into cdbm.users(username,password,role) values('a','a','admin');
