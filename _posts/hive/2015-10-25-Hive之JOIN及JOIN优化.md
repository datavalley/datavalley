---
layout: post
title:  "Hive:JOIN及JOIN"
keywords: "hive"
description: "JOIN基本原理，各种JOIN的区别，JOIN优化"
category: Hive
tags: [hive join]
---

# 1. Join的基本原理

大家都知道，Hive会将所有的SQL查询转化为Map/Reduce作业运行于Hadoop集群之上。在这里简要介绍Hive将Join转化为Map/Reduce的基本原理（其它查询的原理请参考[这里](http://tech.meituan.com/hive-sql-to-mapreduce.html)）。

假定有user和order两张表，分别如下：

user表：

| sid | name |
| --- | --- |
| 1 | apple |
| 2 | orange |

order表：

| uid | orderid |
| --- | --- |
| 1 | 1001 |
| 1 | 1002 |
| 2 | 1003 |

现在想做student和sc两张表上的连接操作：

```SQL
SELECT
  u.name,
  o.orderid
FROM user u
JOIN order o ON u.uid = o.uid;
```

Hive是利用hadoop的Map/Reduce计算框架执行上述查询的呢？？

Hive会将出现在连接条件ON之后的所有字段作为Map输出的key，将所需的字段作为value，构建(key, value)，同时为每张表打上不同的标记tag，输出到Reduce端。在Reduce端，根据tag区分参与连接的表，实现连接操作。

我们使用下图来模拟这个过程：

![join原理图](http://tech.meituan.com/img/hive/join.png)

在Map端分别扫描user和order的两张表。对于user表，在连接条件ON之后的字段为uid，所以以uid作为Map输出的key，在SELECT语句中还需要name字段，所以name字段作为value的一部分，同时为user表赋予标记tag=1，这样处理user表的mapper地输出形式为：(uid, "1" + name)。类似的，处理order表的mapper地输出形式为：(uid, "2" + orderid)，注意，order表的标记为2。

具有相同uid的地(key, value)字段在reduce端“集合”，根据value中tag字段区分来自不同表的数据，使用两层循环完成连接操作。

上面就是将Join操作转换为Map/Reduce作业的基本原理： 在map端扫描表，在reduce端完成连接操作。

# 2. Hive中的各种Join

>**写在前面的话："Hive不支持非等值连接"**

我们使用例子讲述各种Join的区别。假设my_user和my_order两张表的数据变为：

my_user表：

| uid | name |
| --- | --- |
| 1 | apple |
| 2 | orange |
| 3 | banana |

my_order表：

| uid | orderid |
| --- | --- |
| 1 | 1001 |
| 1 | 1002 |
| 2 | 1003 |
| 2 | 1003 |
| 4 | 2001 |

注意，my_order中有一条重复记录。

>“不要考虑例子在现实中的意义，这里这是为了演示各种JOIN的区别”

## 2.1 INNER JOIN

INNER JOIN，又称“内连接”，执行INNER JOIN时，**只有两个表中都有满足连接条件的记录时才会保留数据**。执行以下语句：

```SQL
SELECT
  u.name,
  o.orderid
FROM my_user u
JOIN my_order o ON u.uid = o.uid;
```

结果为：

| name | orderid |
| --- | --- |
| apple | 1001 |
| apple | 1002 |
| orange | 1003 |
| orange | 1003 |

因为表my_order中又重复记录，所以结果中也有重复记录。

## 2.2 LEFT OUTER JOIN

LEFT OUTER JOIN（左外连接），JOIN操作符左边表中符合WHERE条件的所有记录都会被保留，JOIN操作符右边表中如果没有符合ON后面连接条件的记录，则从右边表中选出的列为NULL。

执行以下语句：

```SQL
SELECT
  u.name,
  o.orderid
FROM my_user u
LEFT OUTER JOIN my_order o ON u.uid = o.uid;
```

结果为：

| name | orderid |
| --- | --- |
| apple | 1001 |
| apple | 1002 |
| orange | 1003 |
| orange | 1003 |
| banana | NULL |

这里由于没有WHERE条件，所以左边表my_user中的记录都被保留，对于uid=3的记录，在右边表my_order中没有相应记录，所以orderid为NULL。

## 2.3 RIGHT OUTER JOIN

RIGHT OUTER JOIN（右外连接），LEFT OUTER JOIN相对，JOIN操作符右边表中符合WHERE条件的所有记录都会被保留，JOIN操作符左边表中如果没有符合ON后面连接条件的记录，则从左边表中选出的列为NULL。

```SQL
SELECT
  u.name,
  o.orderid
FROM my_user u
RIGHT OUTER JOIN my_order o ON u.uid = o.uid;
```

执行上面SQL语句的结果为：

| name | orderid |
| --- | --- |
| apple | 1001 |
| apple | 1002 |
| orange | 1003 |
| orange | 1003 |
| NULL | 2001 |

由于左表my_user中不存在uid=4的记录，所以orderid=2001的记录对应的name为NULL。

## 2.3 FULL OUTER JOIN

结合上面的LEFT OUTER JOIN和RIGHT OUTER JOIN，很容易想到FULL OUTER JOIN的运行机制：保留满足WHERE条件的两个表的数据，没有符合连接条件的字段使用NULL填充。来看一个例子：

```SQL
SELECT
  u.name,
  o.orderid
FROM my_user u
FULL OUTER JOIN my_order o ON u.uid = o.uid;
```

执行结果为：

| name | orderid |
| --- | --- |
| apple | 1002 | 
| apple | 1001 | 
| orange | 1003 | 
| orange | 1003 | 
| banana | NULL | 
| NULL | 2001 | 

原因不再解释，请自行思考。

## 2.4 LEFT SMEI JOIN

在早期的Hive版本中，不是IN关键字，可以使用LEFT SEMI JOIN实现类似的功能。

LEFT SEMI JOIN（左半开连接）返回左边表的记录，前提是右边表具有满足ON连接条件的记录。

先来看一个例子：

```SQL
SELECT
  *
FROM my_user u
LEFT SEMI JOIN my_order o ON u.uid = o.uid;
```

执行结果为：

| uid | name |
| --- | --- |
| 1 | apple | 
| 2 | orange | 

虽然SELECT中使用'*'，但是只返回了左表my_user的列，而且重复的记录没有返回（重复记录在my_order表中）

需要强调的是：

+ **在LEFT SEMI JOIN中，SELECT中不允许出现右表中的列**
+ **对于左表中的一条记录，在右表表中一旦找到匹配记录就停止扫描**

# 3. JOIN 优化

现实环境中会进行大量的表连接操作，而且表连接操作通常会耗费很懂时间。因此掌握一些基本的JOIN优化方法成为熟练运用Hive、提高工作效率的基本手段。下面讨论一些常用的JOIN优化方法。

# 3.1 MAP-JOIN

本文一开始介绍了Hive中JOIN的基本原理，这种JOIN没有数据大小的限制，理论上可以用于任何情形。但缺点是：需要map端和reduce端两个阶段，而且JOIN操作是在reduce端完成的，称为reduce side join。

那么，能否省略reduce端，直接在map端执行的“map side join”操作呢？？答案是，可以的。

但有个条件，就是：连接的表中必须有一个小表足以放到每个mapper所在的机器的内存中。

下图展示了map side join的原理。

![map-join.png](http://datavalley.github.io/img/hive/join/map-join.png)

从上图中可以看出，每个mapper都会拿到小表的一个副本，然后每个mapper扫描大表中的一部分数据，与各自的小表副本完成连接操作，这样就可以在map端完成连接操作。

那多大的表才算是“小表”呢？？

默认情况下，25M以下的表是“小表”，该属性由```hive.smalltable.filesize```决定。

有两种方法使用map side join:

+ 直接在SELECT语句中指定“小表”，语法是/\*+MAPJOIN (tbl)\*/，其中tbl就是要复制到每个mapper中去的小表。例如：

```SQL
SELECT
  /*+ MAPJOIN(my_order)*/
  u.name,
  o.orderid
FROM my_user u
LEFT OUTER JOIN my_order o ON u.uid = o.uid;
```

+ 设置```hive.auto.convert.join = true```，这样hive会自动判断当前的join操作是否合适做map join，主要是找join的两个表中有没有小表。

但JOIN的两个表都不是“小表”的时候该怎么办呢？？这就需要BUCKET MAP JOIN上场了。

# 3.2 BUCKET MAP JOIN   

Map side join固然得人心，但终会有“小表”条件不满足的时候。这就需要bucket map join了。

Bucket map join需要待连接的两个表在连接字段上进行分桶（每个分桶对应hdfs上的一个文件），而且小表的桶数需要时大表桶数的倍数。建立分桶表的例子：

```SQL
CREATE TABLE my_user
(
  uid INT,
  name STRING
)
CLUSTERED BY (uid) into 32 buckets
STORED AS TEXTFILE;
```

这样，my_user表就对应32个桶，数据根据uid的hash value 与32取余，然后被分发导不同的桶中。

如果两个表在连接字段上分桶，则可以执行bucket map join了。具体的：

1. 设置属性```hive.optimize.bucketmapjoin= true```控制hive 执行bucket map join；
2. 对小表的每个分桶文件建立一个hashtable，并分发到所有做连接的map端； 
3. map端接受了N（N为小表分桶的个数） 个小表的hashtable，做连接 操作的时候，只需要将小表的一个hashtable 放入内存即可，然后将大表的对应的split 拿出来进行连接，所以其内存限制为小表中最大的那个hashtable 的大小

## 3.3 SORT MERGE  BUCKET MAP JOIN

对于bucket map join中的两个表，如果每个桶内分区字段也是有序的，则还可以进行sort merge bucket map join。对于那个的建表语句为：

```SQL
CREATE TABLE my_user
(
  uid INT,
  name STRING
)
CLUSTERED BY (uid) SORTED BY (uid) into 32 buckets
STORED AS TEXTFILE;
```

这样一来当两边bucket要做局部join的时候，只需要用类似merge sort算法中的merge操作一样把两个bucket顺序遍历一遍即可完成，这样甚至都不用把一个bucket完整的加载成hashtable，而且可以做全连接操作。

进行sort merge bucket map join时，需要设置的属性为：

```SQL
set hive.optimize.bucketmapjoin= true;
set hive.optimize.bucketmapjoin.sortedmerge = true;
set hive.input.format = org.apache.hadoop.hive.ql.io.BucketizedHiveInputFormat;
```

# 4.各种JOIN对比

| JOIN类型| 优点 | 缺点 |
| --- | --- | --- |
|COMMON JOIN | 可以完成各种JOIN操作，不受表大小和表格式的限制 | 无法只在map端完成JOIN操作，耗时长，占用更多地网络资源 |
| MAP JOIN | 可以在map端完成JOIN操作，执行时间短 | 待连接的两个表必须有一个“小表”，“小表”必须加载内存中 |
| BUCKET MAP JOIN | 可以完成MAP JOIN，不受“小表”限制 | 表必须分桶，做连接时小表分桶对应hashtable需要加载到内存 |
| SORT MERGE  BUCKET MAP JOIN | 执行时间短，可以做全连接，几乎不受内存限制 | 表必须分桶，而且桶内数据有序 |

## 参考资料

[1]. Hive SQL的编译过程: http://tech.meituan.com/hive-sql-to-mapreduce.html
[2]. 《Hive变成指南》
[3]. 数据仓库中的SQL性能优化（Hive篇）:http://sunyi514.github.io/2013/09/01/%E6%95%B0%E6%8D%AE%E4%BB%93%E5%BA%93%E4%B8%AD%E7%9A%84sql%E6%80%A7%E8%83%BD%E4%BC%98%E5%8C%96%EF%BC%88hive%E7%AF%87%EF%BC%89/
[4]. Join Strategies in Hive:https://www.google.com.hk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=0CBoQFjAAahUKEwim2badkOTIAhXmxqYKHTw9BfA&url=https%3A%2F%2Fcwiki.apache.org%2Fconfluence%2Fdownload%2Fattachments%2F27362054%2FHive%2BSummit%2B2011-join.pdf&usg=AFQjCNFiPLtjhwezbqYQT_aRYo4wOAmSIA&sig2=RJDLWMpElXYjQvhqV9rocA
[5]. Hadoop 中的两表join: http://www.lxway.net/29500604.html