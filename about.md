---
title: About
layout: page
group: navigation
comment: true
---

#### 简介

一直佩服坚持写东西的人，感觉那些人有思想，有耐心，有文笔。在学校的时候也曾搭建过个人博客，那时最多是玩玩，跟风的嫌疑很大。

现在又重新建了个人博客，用来记录工作和生活中的点点滴滴。虽然这么说，但可能更加偏向技术。算是笔记，也算是总结，也算是随笔——开心就好。

希望自己能够坚持写下去!!!

----

#### Contact me

{% if site.author.email %}
Email：{{ site.author.email }}
{% endif %}

{% if site.author.weibo %}
Weibo：<http://weibo.com/{{ site.author.weibo }}>
{% endif %}

{% if site.author.github %}
Github：<https://github.com/{{ site.author.github }}>
{% endif %}

{% if site.author.twitter %}
Twitter：<https://twitter.com/{{ site.author.twitter }}>
{% endif %}

{% if site.url %}
RSS：[{{ site.url }}{{ '/rss.xml' }}](/rss.xml)
{% endif %}

{% include support.html %}

{% include comments.html %}

----

#### 声明

这个博客通过 [Jekyll](http://jekyllrb.com/) 生成，部署在 [Github](https://pages.github.com)上。模版来自[这里](https://github.com/javachen/javachen-blog-theme)，在此表示感谢

我博客的源码托管在[Github](https://github.com/datavalley/datavalley.github.io)上，如果有任何改进意见，欢迎讨论。
