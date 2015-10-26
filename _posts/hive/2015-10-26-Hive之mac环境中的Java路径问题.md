---
layout: post
title:  "Hive之mac环境中的Java路径问题"
keywords: "hive"
description: "在mac环境下，hadoop找不到java路径"
category: Hive
tags: [hive mac]
---

# 1.问题描述

在mac系统上，搭建了hadoop和hive运行环境。在hive命令行下，可以执行简单的SELECT、SHOW TABLES等操作。但是执行连接时，就会报错，报错信息如下：

```
Query ID = zmz_20151026191653_ea580dc6-ec94-4fcb-8058-b32f8045acfa
Total jobs = 1
15/10/26 19:16:56 WARN util.NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable
15/10/26 19:16:57 WARN conf.Configuration: file:/var/folders/wt/7rnq2frd4hs7bhpvn4jvjq7r0000gn/T/zmz/5040e8a2-fcf9-4bc9-8130-7bfd7b9a6156/hive_2015-10-26_19-16-53_444_13558021487523789-1/-local-10006/jobconf.xml:an attempt to override final parameter: mapreduce.job.end-notification.max.retry.interval;  Ignoring.
15/10/26 19:16:57 WARN conf.Configuration: file:/var/folders/wt/7rnq2frd4hs7bhpvn4jvjq7r0000gn/T/zmz/5040e8a2-fcf9-4bc9-8130-7bfd7b9a6156/hive_2015-10-26_19-16-53_444_13558021487523789-1/-local-10006/jobconf.xml:an attempt to override final parameter: mapreduce.job.end-notification.max.attempts;  Ignoring.
Execution log at: /var/folders/wt/7rnq2frd4hs7bhpvn4jvjq7r0000gn/T//zmz/zmz_20151026191653_ea580dc6-ec94-4fcb-8058-b32f8045acfa.log
2015-10-26 19:16:57 Starting to launch local task to process map join;  maximum memory = 477102080
2015-10-26 19:16:58 Dump the side-table for tag: 1 with group count: 2 into file: file:/var/folders/wt/7rnq2frd4hs7bhpvn4jvjq7r0000gn/T/zmz/5040e8a2-fcf9-4bc9-8130-7bfd7b9a6156/hive_2015-10-26_19-16-53_444_13558021487523789-1/-local-10003/HashTable-Stage-3/MapJoin-mapfile01--.hashtable
2015-10-26 19:16:58 Uploaded 1 File to: file:/var/folders/wt/7rnq2frd4hs7bhpvn4jvjq7r0000gn/T/zmz/5040e8a2-fcf9-4bc9-8130-7bfd7b9a6156/hive_2015-10-26_19-16-53_444_13558021487523789-1/-local-10003/HashTable-Stage-3/MapJoin-mapfile01--.hashtable (311 bytes)
2015-10-26 19:16:58 End of local task; Time Taken: 0.749 sec.
Execution completed successfully
MapredLocal task succeeded
Launching Job 1 out of 1
Number of reduce tasks is set to 0 since there' s no reduce operator
Starting Job = job_1445858122039_0001, Tracking URL = http://zhaomingzhendeMacBook-Pro.local:8088/proxy/application_1445858122039_0001/
Kill Command = /Users/zmz/hadoop-2.5.2/bin/hadoop job  -kill job_1445858122039_0001
Hadoop job information for Stage-3: number of mappers: 0; number of reducers: 0
2015-10-26 19:17:05,269 Stage-3 map = 0%,  reduce = 0%
Ended Job = job_1445858122039_0001 with errors
Error during job, obtaining debugging information...
FAILED: Execution Error, return code 2 from org.apache.hadoop.hive.ql.exec.mr.MapRedTask
MapReduce Jobs Launched:
Stage-Stage-3:  HDFS Read: 0 HDFS Write: 0 FAIL
Total MapReduce CPU Time Spent: 0 msec
```

在浏览器中打开Tracking URL，则看到如下信息：

```
/bin/bash: /bin/java: No such file or directory
```

该怎么解决呢？？

# 2.解决方法

从根本上说，这不是hive的问题，而是hadoop的问题。hadoop默认检查的java路径为：/bin/java。可是在mac中，java的路径为/usr/bin/java。所以，只需建立软连接就可以解决上述问题，执行以下命令：

```
sudo ln -s /usr/bin/java /bin/java
```

运行上述命令后，上述问题就可以解决了。其实，最关键的就是将/bin/java连接到java所在的路径。
